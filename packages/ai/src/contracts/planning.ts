// =============================================================================
// ShipFlow AI — Planning Agent Contracts
// =============================================================================

import type { EngineeringPlan } from "../schemas/planning";

/**
 * Input context loaded by the Planning Agent before generation.
 */
export interface PlanningGenerationContext {
  prdId: string;
  featureId: string;
  workspaceId: string;
  prdTitle: string;
  prdDescription: string;
  prdContent: string; // The full PRD JSON content or markdown representation
  conversationHistory?: string;
}

/**
 * Result returned by the Planning Agent after successful generation.
 */
export interface PlanningGenerationResult {
  prdId: string;
  featureId: string;
  agentRunId: string;
  plan: EngineeringPlan;
}

/**
 * Reconstructed plan response returned when querying the plan.
 */
export interface EngineeringPlanResponse {
  prdId: string;
  featureId: string;
  version: number;
  plan: EngineeringPlan;
  agentRunId: string;
}
