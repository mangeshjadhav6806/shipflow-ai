// =============================================================================
// ShipFlow AI — Discovery Step 1: Feature Analyzer
// =============================================================================

import { AgentType } from "@prisma/client";
import { AgentRunner } from "../../core/agent-runner";
import { featureAnalysisSchema, FeatureAnalysis } from "../../schemas/discovery";

export class FeatureAnalyzer {
  static async analyze(
    featureId: string,
    description: string,
    workspaceId: string,
    parentRunId?: string
  ): Promise<{ analysis: FeatureAnalysis; agentRunId: string }> {
    const result = await AgentRunner.run({
      agentType: AgentType.CLARIFICATION,
      featureId,
      workspaceId,
      promptKey: "discovery:analysis",
      schema: featureAnalysisSchema,
      inputVariables: {
        description,
      },
      parentRunId,
    });

    return {
      analysis: result.object,
      agentRunId: result.agentRunId,
    };
  }
}
