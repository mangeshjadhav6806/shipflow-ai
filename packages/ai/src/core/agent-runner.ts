// =============================================================================
// ShipFlow AI — Reusable Agent Runner
// =============================================================================

import { z } from "zod";
import { prisma } from "@shipflow/db";
import { AgentType, AgentStatus } from "@prisma/client";
import { logger } from "@shipflow/logger";
import { getProvider, AIProvider } from "../providers/index";
import { loadPrompt } from "./prompt-loader";
import { validateOutput } from "./output-validator";
import { withRetry } from "./retry";

export interface AgentRunnerConfig<T> {
  agentType: AgentType;
  featureId: string;
  workspaceId: string;
  promptKey: string;
  schema: z.ZodSchema<T>;
  inputVariables: Record<string, string>;
  parentRunId?: string;
  preferredProvider?: string;
}

export interface AgentRunnerResult<T> {
  object: T;
  agentRunId: string;
  providerName: string;
  modelName: string;
}

export class AgentRunner {
  static async run<T>(config: AgentRunnerConfig<T>): Promise<AgentRunnerResult<T>> {
    const startTime = Date.now();

    // 1. Create AgentRun record in DB
    const agentRun = await prisma.agentRun.create({
      data: {
        featureId: config.featureId,
        agentType: config.agentType,
        status: AgentStatus.RUNNING,
        retryOf: config.parentRunId,
      },
    });

    const runId = agentRun.id;
    const provider = getProvider(config.preferredProvider);

    // Helper to log and persist messages to AgentLog
    const log = async (level: "info" | "warn" | "error" | "debug", message: string, metadata?: any) => {
      const logMessage = `[AgentRunner][${config.agentType}][${runId}] ${message}`;
      if (level === "debug" || level === "info") {
        logger.info(logMessage, metadata);
      } else if (level === "warn") {
        logger.warn(logMessage, metadata);
      } else if (level === "error") {
        logger.error(logMessage, metadata);
      }
      try {
        await prisma.agentLog.create({
          data: {
            agentRunId: runId,
            logLevel: level,
            message,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
          },
        });
      } catch (err) {
        logger.error(`[AgentRunner] Failed to persist log line.`, err);
      }
    };

    await log("info", `Started agent run using model ${provider.modelName} from provider ${provider.providerName}`);

    try {
      // 2. Load prompt template
      const { template, version, source } = await loadPrompt(config.promptKey, config.agentType);
      await log("info", `Loaded prompt key "${config.promptKey}" version ${version} from ${source}`);

      // Substitute variables in prompt template
      let formattedPrompt = template;
      for (const [key, value] of Object.entries(config.inputVariables)) {
        formattedPrompt = formattedPrompt.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value || "");
      }

      // 3. Save initial prompt context snapshot
      await prisma.contextSnapshot.create({
        data: {
          agentRunId: runId,
          snapshot: {
            promptKey: config.promptKey,
            promptVersion: version,
            promptSource: source,
            variables: config.inputVariables,
            finalPrompt: formattedPrompt,
          },
        },
      });

      let attemptCount = 0;
      let finalResponseObj: T | null = null;
      let finalUsage: any = null;

      // 4. Execute AI call with retry & validation
      await withRetry(
        async () => {
          attemptCount++;
          await log("info", `Calling AI provider (Attempt ${attemptCount})`);

          const response = await provider.generateObject(formattedPrompt, config.schema);
          
          // Validate the schema using the output-validator
          finalResponseObj = validateOutput(config.schema, response.object);
          finalUsage = response.usage;

          await log("info", `Successfully received and validated structured output`);
        },
        {
          maxRetries: 3,
          onRetry: async (error, attempt, nextDelayMs) => {
            // Track retries in AgentRetry table
            try {
              await prisma.agentRetry.create({
                data: {
                  agentRunId: runId,
                  retryCount: attempt,
                  errorReason: error.message || String(error),
                },
              });
            } catch (err) {
              logger.error(`[AgentRunner] Failed to log AgentRetry in DB.`, err);
            }
            await log("warn", `Validation/Execution failed on attempt ${attempt}. Retrying in ${nextDelayMs}ms. Error: ${error.message}`);
          },
        }
      );

      if (!finalResponseObj || !finalUsage) {
        throw new Error("AI call executed but returned empty response or token usage info.");
      }

      const executionDuration = Date.now() - startTime;

      // 5. Save Token Usage in DB
      await prisma.tokenUsage.create({
        data: {
          workspaceId: config.workspaceId,
          agentRunId: runId,
          modelName: provider.modelName,
          inputTokens: finalUsage.inputTokens,
          outputTokens: finalUsage.outputTokens,
          cost: finalUsage.cost,
        },
      });

      // 6. Update AgentRun with Success status
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: AgentStatus.SUCCESS,
          executionDuration,
          cost: finalUsage.cost,
        },
      });

      await log("info", `Completed agent run successfully. Duration: ${executionDuration}ms. Cost: $${finalUsage.cost.toFixed(6)}`);

      return {
        object: finalResponseObj,
        agentRunId: runId,
        providerName: provider.providerName,
        modelName: provider.modelName,
      };
    } catch (err: any) {
      const executionDuration = Date.now() - startTime;
      await log("error", `Agent run failed after retry limit. Error: ${err.message || err}`, { stack: err.stack });

      // Update AgentRun with Failure status
      try {
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: AgentStatus.FAILED,
            executionDuration,
            errorMessage: err.message || String(err),
          },
        });
      } catch (dbErr) {
        logger.error(`[AgentRunner] Failed to mark run as failed in DB.`, dbErr);
      }

      throw err;
    }
  }
}
