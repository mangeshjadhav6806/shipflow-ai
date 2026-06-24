// =============================================================================
// ShipFlow AI — Repository Agent Contracts
// =============================================================================

import type { RepositoryAnalysis } from "../schemas/repository";
import type { RepositorySearchResponse } from "@shipflow/types";

export interface RepositoryAnalysisContext {
  owner: string;
  name: string;
  defaultBranch: string;
  filesList: string[]; // List of files in the repository
  staticAnalysis: {
    framework: string;
    packageManager: string;
    languages: string[];
    ciProvider: string;
    dockerSupport: boolean;
    deploymentPlatform: string;
    configFiles: string[];
  };
}

export interface RepositoryAnalysisResult {
  repositoryId: string;
  agentRunId: string;
  analysis: RepositoryAnalysis;
}

export interface RepositorySearchContext {
  query: string;
  featureId?: string;
  filesList: string[];
  technologyStackSummary: string;
}
