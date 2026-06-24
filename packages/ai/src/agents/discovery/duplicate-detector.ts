// =============================================================================
// ShipFlow AI — Discovery Step 3: Duplicate Detector
// =============================================================================

import { AgentType } from "@prisma/client";
import { prisma } from "@shipflow/db";
import { AgentRunner } from "../../core/agent-runner";
import { duplicateCheckSchema, DuplicateCheck } from "../../schemas/discovery";
import { logger } from "@shipflow/logger";

export class FeatureDuplicateDetector {
  static async check(
    featureId: string,
    description: string,
    workspaceId: string,
    parentRunId?: string
  ): Promise<{ duplicateCheck: DuplicateCheck; agentRunId: string }> {
    // 1. Query other features in the same workspace to act as candidates
    let features: { id: string; title: string; description: string }[] = [];
    try {
      features = await prisma.feature.findMany({
        where: {
          workspaceId,
          id: { not: featureId },
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
        },
        take: 20, // limit to a reasonable number to fit in context window
      });
    } catch (error) {
      logger.error(`[Duplicate Detector] Failed to query existing features:`, error);
    }

    // Format candidates list for prompt
    const candidatesStr = features.length > 0
      ? features.map((f) => `Feature ID: ${f.id}\nTitle: ${f.title}\nDescription: ${f.description}`).join("\n\n---\n\n")
      : "No existing features in workspace.";

    // 2. Call AI to evaluate duplicates
    const result = await AgentRunner.run({
      agentType: AgentType.CLARIFICATION,
      featureId,
      workspaceId,
      promptKey: "discovery:duplicate",
      schema: duplicateCheckSchema,
      inputVariables: {
        description,
        existingFeatures: candidatesStr,
      },
      parentRunId,
    });

    return {
      duplicateCheck: result.object,
      agentRunId: result.agentRunId,
    };
  }
}
