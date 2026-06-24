// =============================================================================
// ShipFlow AI — Planning Validator Schemas
// =============================================================================

import { z } from "zod";

/**
 * Schema for generating a plan from an approved PRD.
 */
export const generatePlanSchema = z.object({
  prdId: z.string().uuid("Invalid prdId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for regenerating a plan.
 */
export const regeneratePlanSchema = z.object({
  prdId: z.string().uuid("Invalid prdId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for fetching a plan.
 */
export const getPlanSchema = z.object({
  prdId: z.string().uuid("Invalid prdId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for fetching plan metrics.
 */
export const getPlanningMetricsSchema = z.object({
  prdId: z.string().uuid("Invalid prdId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});
