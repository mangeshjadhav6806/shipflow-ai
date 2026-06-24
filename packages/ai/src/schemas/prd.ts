// =============================================================================
// ShipFlow AI — PRD Agent Output Schemas
// =============================================================================

import { z } from "zod";

/**
 * A single user persona extracted from the feature spec.
 */
export const userPersonaSchema = z.object({
  name: z.string(),
  role: z.string(),
  goal: z.string(),
  painPoints: z.array(z.string()),
});

/**
 * A single user story in "As a … I want … so that …" format.
 */
export const userStorySchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.string(),
  benefit: z.string(),
  priority: z.enum(["MUST_HAVE", "SHOULD_HAVE", "COULD_HAVE", "WONT_HAVE"]),
});

/**
 * A single functional requirement.
 */
export const functionalRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["MUST_HAVE", "SHOULD_HAVE", "COULD_HAVE", "WONT_HAVE"]),
});

/**
 * A single non-functional requirement (performance, security, etc.).
 */
export const nonFunctionalRequirementSchema = z.object({
  id: z.string(),
  category: z.string(), // e.g. "Performance", "Security", "Accessibility"
  description: z.string(),
  measurable: z.string(), // e.g. "p99 latency < 200ms"
});

/**
 * A single acceptance criterion.
 */
export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  scenario: z.string(),
  given: z.string(),
  when: z.string(),
  then: z.string(),
});

/**
 * A single risk entry.
 */
export const prdRiskSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  likelihood: z.enum(["LOW", "MEDIUM", "HIGH"]),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]),
  mitigation: z.string(),
});

/**
 * A single dependency entry (external service, team, library, etc.).
 */
export const prdDependencySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // "EXTERNAL_API", "INTERNAL_TEAM", "LIBRARY", etc.
  description: z.string(),
});

/**
 * A single success metric.
 */
export const successMetricSchema = z.object({
  id: z.string(),
  metric: z.string(),
  baseline: z.string(),
  target: z.string(),
  measurementMethod: z.string(),
});

/**
 * Complete structured PRD output schema.
 * Markdown rendering is a SEPARATE step.
 */
export const prdDocumentSchema = z.object({
  executiveSummary: z.string(),
  problemStatement: z.string(),
  goals: z.array(z.string()),
  nonGoals: z.array(z.string()),
  userPersonas: z.array(userPersonaSchema),
  userStories: z.array(userStorySchema),
  functionalRequirements: z.array(functionalRequirementSchema),
  nonFunctionalRequirements: z.array(nonFunctionalRequirementSchema),
  acceptanceCriteria: z.array(acceptanceCriterionSchema),
  edgeCases: z.array(z.string()),
  risks: z.array(prdRiskSchema),
  dependencies: z.array(prdDependencySchema),
  successMetrics: z.array(successMetricSchema),
  outOfScope: z.array(z.string()),
  futureEnhancements: z.array(z.string()),
});

export type PRDDocument = z.infer<typeof prdDocumentSchema>;
export type UserPersona = z.infer<typeof userPersonaSchema>;
export type UserStory = z.infer<typeof userStorySchema>;
export type FunctionalRequirement = z.infer<typeof functionalRequirementSchema>;
export type NonFunctionalRequirement = z.infer<typeof nonFunctionalRequirementSchema>;
export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
export type PRDRisk = z.infer<typeof prdRiskSchema>;
export type PRDDependency = z.infer<typeof prdDependencySchema>;
export type SuccessMetric = z.infer<typeof successMetricSchema>;
