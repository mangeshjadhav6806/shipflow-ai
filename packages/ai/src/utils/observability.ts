// =============================================================================
// ShipFlow AI — AI Observability & Metrics
// =============================================================================

import { prisma } from "@shipflow/db";
import { logger } from "@shipflow/logger";

export interface AgentRunMetrics {
  agentRunId: string;
  agentType: string;
  status: string;
  latencyMs: number | null; // executionDuration
  retryCount: number;
  providerName: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export class AIObservability {
  /**
   * Aggregates execution metrics for a specific agent run.
   */
  static async getAgentRunMetrics(agentRunId: string): Promise<AgentRunMetrics> {
    try {
      const agentRun = await prisma.agentRun.findUnique({
        where: { id: agentRunId },
        include: {
          tokenUsages: true,
          logs: {
            where: {
              message: {
                contains: "Started agent run",
              },
            },
            take: 1,
          },
          retries: true,
        },
      });

      if (!agentRun) {
        throw new Error(`AgentRun with ID "${agentRunId}" not found.`);
      }

      // Sum token usage fields
      let inputTokens = 0;
      let outputTokens = 0;
      let estimatedCostUsd = 0;
      let modelName = "unknown";

      for (const usage of agentRun.tokenUsages) {
        inputTokens += usage.inputTokens;
        outputTokens += usage.outputTokens;
        estimatedCostUsd += Number(usage.cost);
        modelName = usage.modelName;
      }

      // Parse provider name from start log if present, otherwise default
      let providerName = "unknown";
      const startLog = agentRun.logs[0];
      if (startLog?.message) {
        const match = startLog.message.match(/provider (\w+)/i);
        if (match && match[1]) {
          providerName = match[1];
        }
      }

      const retryCount = agentRun.retries.length;

      return {
        agentRunId: agentRun.id,
        agentType: agentRun.agentType,
        status: agentRun.status,
        latencyMs: agentRun.executionDuration,
        retryCount,
        providerName,
        modelName,
        inputTokens,
        outputTokens,
        estimatedCostUsd,
      };
    } catch (error) {
      logger.error(`[Observability] Failed to fetch metrics for agent run ${agentRunId}:`, error);
      throw error;
    }
  }
}
