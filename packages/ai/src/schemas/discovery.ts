// =============================================================================
// ShipFlow AI — Discovery Agent Output Schemas
// =============================================================================

import { z } from "zod";

/**
 * Step 1: Feature Analysis Output Schema
 */
export const featureAnalysisSchema = z.object({
  isAmbiguous: z.boolean(),
  isFeasible: z.boolean(),
  needsClarification: z.boolean(),
  missingContext: z.array(z.string()),
  complexityEstimate: z.enum(["LOW", "MEDIUM", "HIGH"]),
  primaryCategory: z.string(),
  initialTitle: z.string(),
  initialDescription: z.string(),
});

export type FeatureAnalysis = z.infer<typeof featureAnalysisSchema>;

/**
 * Step 2: Clarification Questions Output Schema
 */
export const clarificationQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).optional(),
      reason: z.string(),
    })
  ),
});

export type ClarificationQuestions = z.infer<typeof clarificationQuestionsSchema>;

/**
 * Step 3: Duplicate Check Output Schema
 */
export const duplicateCheckSchema = z.object({
  hasDuplicates: z.boolean(),
  potentialDuplicates: z.array(
    z.object({
      featureId: z.string(),
      similarityScore: z.number(), // 0.0 to 1.0
      reason: z.string(),
    })
  ),
});

export type DuplicateCheck = z.infer<typeof duplicateCheckSchema>;

/**
 * Step 5: Feature Specification Output Schema
 */
export const featureSpecificationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  userStories: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  technicalRequirements: z.array(z.string()),
  outOfScope: z.array(z.string()),
  riskAnalysis: z.object({
    isRisky: z.boolean(),
    score: z.number(), // 0.0 to 1.0
    risks: z.array(
      z.object({
        category: z.string(),
        description: z.string(),
        mitigation: z.string(),
      })
    ),
  }),
});

export type FeatureSpecification = z.infer<typeof featureSpecificationSchema>;
