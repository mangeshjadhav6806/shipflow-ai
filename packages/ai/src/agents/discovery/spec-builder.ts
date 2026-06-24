// =============================================================================
// ShipFlow AI — Discovery Step 5: Spec Builder
// =============================================================================

import { AgentType } from "@prisma/client";
import { prisma } from "@shipflow/db";
import { AgentRunner } from "../../core/agent-runner";
import { featureSpecificationSchema, FeatureSpecification } from "../../schemas/discovery";
import { RepositoryContext } from "../../contracts/context";
import { logger } from "@shipflow/logger";

export class FeatureSpecBuilder {
  static async build(
    featureId: string,
    description: string,
    repoContext: RepositoryContext,
    workspaceId: string,
    parentRunId?: string
  ): Promise<{ spec: FeatureSpecification; agentRunId: string }> {
    // 1. Gather clarification questions and answers
    let qaStr = "No clarification questions were asked.";
    try {
      const qas = await prisma.clarificationQuestion.findMany({
        where: { featureId },
        include: { answer: true },
        orderBy: { orderIndex: "asc" },
      });

      if (qas.length > 0) {
        qaStr = qas
          .map(
            (q) =>
              `Question: ${q.question}\nAnswer: ${
                q.answer ? q.answer.answer : "Unanswered"
              }`
          )
          .join("\n\n");
      }
    } catch (error) {
      logger.error(`[Spec Builder] Failed to load Q&A context:`, error);
    }

    // 2. Call AI to compile the specification
    const result = await AgentRunner.run({
      agentType: AgentType.CLARIFICATION,
      featureId,
      workspaceId,
      promptKey: "discovery:spec",
      schema: featureSpecificationSchema,
      inputVariables: {
        description,
        repoContext: JSON.stringify(repoContext, null, 2),
        clarificationAnswers: qaStr,
      },
      parentRunId,
    });

    const spec = result.object;

    // 3. Persist the specification inside the PRD table as JSON content
    try {
      await prisma.pRD.upsert({
        where: { featureId },
        create: {
          featureId,
          version: 1,
          content: JSON.stringify(spec),
        },
        update: {
          version: { increment: 1 },
          content: JSON.stringify(spec),
        },
      });
      logger.info(`[Spec Builder] Saved feature specification inside PRD table for feature ${featureId}`);
    } catch (error) {
      logger.error(`[Spec Builder] Failed to save specification to PRD table:`, error);
    }

    return {
      spec,
      agentRunId: result.agentRunId,
    };
  }
}
