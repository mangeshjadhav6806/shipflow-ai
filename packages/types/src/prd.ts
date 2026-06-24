// =============================================================================
// ShipFlow AI — Shared PRD Type Definitions
// =============================================================================

/**
 * Priority levels for user stories and functional requirements.
 */
export type MoSCoWPriority = "MUST_HAVE" | "SHOULD_HAVE" | "COULD_HAVE" | "WONT_HAVE";

/**
 * Likelihood/impact levels for risk entries.
 */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * A user persona describing who the feature serves.
 */
export interface PRDUserPersona {
  name: string;
  role: string;
  goal: string;
  painPoints: string[];
}

/**
 * A user story in actor/action/benefit format.
 */
export interface PRDUserStory {
  id: string;
  actor: string;
  action: string;
  benefit: string;
  priority: MoSCoWPriority;
}

/**
 * A specific functional requirement.
 */
export interface PRDFunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: MoSCoWPriority;
}

/**
 * A non-functional requirement (performance, security, reliability, etc.).
 */
export interface PRDNonFunctionalRequirement {
  id: string;
  category: string;
  description: string;
  measurable: string;
}

/**
 * An acceptance criterion in BDD Given/When/Then format.
 */
export interface PRDAcceptanceCriterion {
  id: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

/**
 * A risk entry with likelihood/impact/mitigation.
 */
export interface PRDRisk {
  id: string;
  category: string;
  description: string;
  likelihood: RiskLevel;
  impact: RiskLevel;
  mitigation: string;
}

/**
 * A dependency (external API, internal team, library, etc.).
 */
export interface PRDDependency {
  id: string;
  name: string;
  type: string;
  description: string;
}

/**
 * A measurable success metric.
 */
export interface PRDSuccessMetric {
  id: string;
  metric: string;
  baseline: string;
  target: string;
  measurementMethod: string;
}

/**
 * The complete PRD document structure.
 * JSON-first; Markdown is derived from this.
 */
export interface PRDDocument {
  executiveSummary: string;
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  userPersonas: PRDUserPersona[];
  userStories: PRDUserStory[];
  functionalRequirements: PRDFunctionalRequirement[];
  nonFunctionalRequirements: PRDNonFunctionalRequirement[];
  acceptanceCriteria: PRDAcceptanceCriterion[];
  edgeCases: string[];
  risks: PRDRisk[];
  dependencies: PRDDependency[];
  successMetrics: PRDSuccessMetric[];
  outOfScope: string[];
  futureEnhancements: string[];
}

/**
 * Metadata for a single PRD version row.
 */
export interface PRDVersionMeta {
  prdId: string;
  featureId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Change type in a PRD diff.
 */
export type PRDDiffChangeType = "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";

/**
 * A single diff entry when comparing PRD versions.
 */
export interface PRDDiffEntry {
  field: string;
  versionA: unknown;
  versionB: unknown;
  changeType: PRDDiffChangeType;
}

/**
 * Result of comparing two PRD versions.
 */
export interface PRDCompareResult {
  featureId: string;
  versionA: number;
  versionB: number;
  diff: PRDDiffEntry[];
  summary: string;
}
