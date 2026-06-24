// =============================================================================
// ShipFlow AI — Discovery Step 2: Clarifier Questions Generator
// =============================================================================

import { AgentType } from "@prisma/client";
import { prisma } from "@shipflow/db";
import { AgentRunner } from "../../core/agent-runner";
import { clarificationQuestionsSchema, ClarificationQuestions } from "../../schemas/discovery";
import { logger } from "@shipflow/logger";

export class FeatureClarifier {
  static async clarify(
    featureId: string,
    description: string,
    missingContext: string[],
    workspaceId: string,
    parentRunId?: string
  ): Promise<{ questions: ClarificationQuestions; agentRunId: string }> {
    const result = await AgentRunner.run({
      agentType: AgentType.CLARIFICATION,
      featureId,
      workspaceId,
      promptKey: "discovery:clarification",
      schema: clarificationQuestionsSchema,
      inputVariables: {
        description,
        missingContext: missingContext.join(", "),
      },
      parentRunId,
    });

    const clarificationQuestions = result.object;

    // Persist questions in database
    try {
      await prisma.clarificationQuestion.deleteMany({
        where: { featureId },
      });

      const createPromises = clarificationQuestions.questions.map((q, index) =>
        prisma.clarificationQuestion.create({
          data: {
            featureId,
            question: q.question,
            options: q.options ? q.options : undefined,
            orderIndex: index,
          },
        })
      );

      await Promise.all(createPromises);
      logger.info(`[Clarifier] Persisted ${createPromises.length} clarification questions to DB for feature ${featureId}`);
    } catch (error) {
      logger.error(`[Clarifier] Failed to persist clarification questions:`, error);
      throw error;
    }

    return {
      questions: clarificationQuestions,
      agentRunId: result.agentRunId,
    };
  }
}
