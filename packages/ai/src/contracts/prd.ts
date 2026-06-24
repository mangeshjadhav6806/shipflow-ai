// =============================================================================
// ShipFlow AI — PRD Agent Contracts
// =============================================================================

import type { PRDDocument } from "../schemas/prd";

/**
 * Input context loaded by the PRD Agent before generation.
 */
export interface PRDGenerationContext {
  featureId: string;
  workspaceId: string;
  featureTitle: string;
  featureDescription: string;
  featureStatus: string;
  featureSpecJson: string; // JSON string of the approved FeatureSpecification
  clarificationQA: string; // formatted Q&A text
  conversationHistory: string; // formatted conversation history
}

/**
 * Result returned by the PRD Agent after a successful generation run.
 */
export interface PRDGenerationResult {
  prdId: string;
  version: number;
  featureId: string;
  document: PRDDocument;
  markdownContent: string;
  agentRunId: string;
}

/**
 * Minimal PRD version metadata returned in list operations.
 */
export interface PRDVersionMeta {
  prdId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A structured JSON diff entry comparing two PRD versions.
 */
export interface PRDDiffEntry {
  field: string;
  versionA: unknown;
  versionB: unknown;
  changeType: "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";
}

/**
 * Result of the compareVersions operation.
 */
export interface PRDCompareResult {
  featureId: string;
  versionA: number;
  versionB: number;
  diff: PRDDiffEntry[];
  summary: string;
}
