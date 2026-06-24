// =============================================================================
// ShipFlow AI — AI Plugin Architecture Contracts
// =============================================================================
// Interface-only definitions for extending AI agents with pluggable capabilities.
// =============================================================================

import { RepositoryContext } from "./context";

export interface AIPlugin {
  name: string;
  version: string;
  initialize(config: Record<string, unknown>): Promise<void>;
}

export interface DuplicateMatch {
  featureId: string;
  title: string;
  similarityScore: number;
  reason: string;
}

export interface DuplicateDetectionPlugin extends AIPlugin {
  findDuplicates(text: string, workspaceId: string): Promise<DuplicateMatch[]>;
}

export interface RepositoryPlugin extends AIPlugin {
  getContext(workspaceId: string, query: string): Promise<RepositoryContext>;
}

export interface MemoryPlugin extends AIPlugin {
  recall(conversationId: string, query: string): Promise<string>;
}

export interface RiskReport {
  isRisky: boolean;
  score: number;
  risks: {
    category: string;
    description: string;
    mitigation: string;
  }[];
}

export interface RiskAnalysisPlugin extends AIPlugin {
  analyzeRisks(specContent: string): Promise<RiskReport>;
}
