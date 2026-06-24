// =============================================================================
// ShipFlow AI — PRD Validator Schemas
// =============================================================================

import { z } from "zod";

/**
 * Schema for creating a PRD from an approved feature.
 */
export const createPRDSchema = z.object({
  featureId: z.string().uuid("Invalid featureId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for regenerating a PRD (creates a new version).
 */
export const regeneratePRDSchema = z.object({
  featureId: z.string().uuid("Invalid featureId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for fetching the current PRD for a feature.
 */
export const getPRDSchema = z.object({
  featureId: z.string().uuid("Invalid featureId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for listing PRD version history for a feature.
 */
export const listPRDVersionsSchema = z.object({
  featureId: z.string().uuid("Invalid featureId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for comparing two PRD versions.
 */
export const comparePRDVersionsSchema = z.object({
  featureId: z.string().uuid("Invalid featureId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
  versionA: z.number().int().min(1),
  versionB: z.number().int().min(1),
});
