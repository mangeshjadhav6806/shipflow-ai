// =============================================================================
// ShipFlow AI — Repository Agent Output Schemas
// =============================================================================

import { z } from "zod";

/**
 * Zod schema for repository capabilities.
 */
export const repositoryCapabilitySchema = z.object({
  name: z.string(),
  supported: z.boolean(),
  description: z.string(),
  missingDetails: z.string().optional(),
});

/**
 * Zod schema for detected modules.
 */
export const detectedModuleSchema = z.object({
  name: z.string(),
  path: z.string(),
  description: z.string(),
});

/**
 * Zod schema for directory mapping.
 */
export const directoryMapEntrySchema = z.object({
  path: z.string(),
  purpose: z.string(),
});

/**
 * Zod schema for important entry points.
 */
export const entryPointSchema = z.object({
  path: z.string(),
  description: z.string(),
});

/**
 * Zod schema for Repository Capability Report.
 */
export const repositoryCapabilityReportSchema = z.object({
  existingCapabilities: z.array(z.string()),
  missingCapabilities: z.array(z.string()),
  gapAnalysis: z.string(),
});

/**
 * Zod schema for module-level dependency graph edge.
 */
export const dependencyGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

/**
 * Zod schema for major entry points.
 */
export const majorEntryPointsSchema = z.object({
  frontendEntry: z.string(),
  backendEntry: z.string(),
  middlewareChain: z.string(),
  apiLayer: z.string(),
  databaseLayer: z.string(),
});

/**
 * Zod schema for repository health metrics.
 */
export const repositoryHealthMetricsSchema = z.object({
  fileCount: z.number().int().min(0),
  typescriptCoverage: z.number().min(0).max(100),
  testCoverage: z.number().min(0).max(100),
  outdatedDependenciesCount: z.number().int().min(0),
  lintErrorEstimate: z.number().int().min(0),
  documentationScore: z.number().min(0).max(100),
});

/**
 * Structured repository analysis output schema.
 * Reused inside ContextSnapshot as RepositoryMemory.
 */
export const repositoryAnalysisSchema = z.object({
  summary: z.string(),
  healthMetrics: repositoryHealthMetricsSchema,
  importantEntryPoints: z.array(entryPointSchema),
  repositoryCapabilities: z.array(repositoryCapabilitySchema),
  detectedModules: z.array(detectedModuleSchema),
  directoryMap: z.array(directoryMapEntrySchema),
  architectureSummary: z.string(),
  capabilityReport: repositoryCapabilityReportSchema,
  dependencyGraph: z.array(dependencyGraphEdgeSchema),
  majorEntryPoints: majorEntryPointsSchema,
});

/**
 * Structured search ranked file output.
 */
export const searchResultSchema = z.object({
  affectedModule: z.string(),
  affectedDirectory: z.string(),
  affectedFiles: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

/**
 * Structured output schema for relevant files ranking.
 */
export const relevantFilesRankingSchema = z.object({
  rankedAreas: z.array(searchResultSchema),
});

export type RepositoryAnalysis = z.infer<typeof repositoryAnalysisSchema>;
export type RepositorySearchResponse = z.infer<typeof relevantFilesRankingSchema>;
