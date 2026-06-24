// =============================================================================
// ShipFlow AI — Repository Validator Schemas
// =============================================================================

import { z } from "zod";

/**
 * Schema for connecting a repository to a project.
 */
export const connectRepositorySchema = z.object({
  projectId: z.string().uuid("Invalid projectId"),
  owner: z.string().min(1, "Owner is required"),
  name: z.string().min(1, "Repository name is required"),
  defaultBranch: z.string().default("main"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for triggering repository analysis.
 */
export const analyzeRepositorySchema = z.object({
  repositoryId: z.string().uuid("Invalid repositoryId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for fetching the current repository summary.
 */
export const getRepositorySummarySchema = z.object({
  repositoryId: z.string().uuid("Invalid repositoryId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for searching relevant areas.
 */
export const searchRelevantAreasSchema = z.object({
  repositoryId: z.string().uuid("Invalid repositoryId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
  featureId: z.string().uuid("Invalid featureId").optional(),
  query: z.string().min(1, "Search query is required"),
});

/**
 * Schema for fetching tech stack.
 */
export const getTechnologyStackSchema = z.object({
  repositoryId: z.string().uuid("Invalid repositoryId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});

/**
 * Schema for fetching repository health.
 */
export const getRepositoryHealthSchema = z.object({
  repositoryId: z.string().uuid("Invalid repositoryId"),
  workspaceId: z.string().uuid("Invalid workspaceId"),
});
