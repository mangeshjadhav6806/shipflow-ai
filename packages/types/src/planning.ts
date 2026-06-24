// =============================================================================
// ShipFlow AI — Shared Planning Type Definitions
// =============================================================================

export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH";
export type AffectedArea = "Frontend" | "Backend" | "Database" | "API" | "Infrastructure" | "Documentation" | "Testing";

export interface TaskReasoning {
  whyThisTaskExists: string;
  whyThisOrder: string;
  whyThisDependsOn: string;
}

export interface EngineeringTask {
  id: string; // e.g. "TASK-001"
  title: string;
  description: string;
  filesAffected: string[]; // actual repository file paths
  epicId: string;
  storyPoints: number;
  complexity: ComplexityLevel;
  estimatedHours: number;
  labels: string[];
  blockers: string[]; // dependent task IDs
  acceptanceCriteria: string[];
  confidence: {
    score: number;
    reason: string;
  };
  riskAnalysis: {
    level: ComplexityLevel;
    description: string;
    mitigation: string;
  };
  affectedAreas: AffectedArea[];
  reasoning: TaskReasoning;
}

export interface EngineeringEpic {
  id: string; // e.g. "EPIC-001"
  title: string;
  description: string;
  riskAnalysis: {
    level: ComplexityLevel;
    description: string;
    mitigation: string;
  };
}

export interface TestingStrategy {
  unit: string;
  integration: string;
  endToEnd: string;
  performance: string;
  security: string;
}

export interface ExecutionMetadata {
  criticalPath: string[]; // ordered task IDs
  parallelWorkGroups: string[][]; // groups of task IDs
}

export interface ImplementationPhase {
  name: string;
  description: string;
  taskIds: string[];
}

export interface ImplementationStrategy {
  recommendedCommitSequence: string[];
  implementationPhases: ImplementationPhase[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  taskIds: string[];
}

export interface PlanningMetrics {
  totalTasks: number;
  totalStoryPoints: number;
  estimatedHours: number;
  criticalPathLength: number;
  parallelizationPercentage: number;
  averageConfidence: number;
  riskScore: number;
  testingCoverage: number;
}

export interface EngineeringPlan {
  epics: EngineeringEpic[];
  tasks: EngineeringTask[];
  testingStrategy: TestingStrategy;
  executionMetadata: ExecutionMetadata;
  implementationStrategy: ImplementationStrategy;
  milestones: Milestone[];
  metrics: PlanningMetrics;
}

/**
 * Interface returned by planning retrieval endpoints (reconstructed from Tasks + ContextSnapshot).
 */
export interface EngineeringPlanResponse {
  prdId: string;
  featureId: string;
  version: number;
  plan: EngineeringPlan;
  agentRunId: string;
}
