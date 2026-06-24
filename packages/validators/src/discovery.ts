// =============================================================================
// ShipFlow AI — Discovery Validator Schemas
// =============================================================================

import { z } from "zod";

export const submitRequestSchema = z.object({
  rawText: z.string().min(1, "Request text cannot be empty"),
  projectId: z.string().uuid("Invalid projectId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

export const answerClarificationSchema = z.object({
  featureId: z.string().uuid("Invalid featureId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
  answers: z.array(
    z.object({
      questionId: z.string().uuid("Invalid questionId"),
      answerText: z.string().min(1, "Answer cannot be empty"),
    })
  ),
});
