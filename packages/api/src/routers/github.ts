// =============================================================================
// ShipFlow AI — GitHub / Repository Router
// =============================================================================

import { router, workspaceProcedure } from "../trpc";
import {
  connectRepositorySchema,
  analyzeRepositorySchema,
  getRepositorySummarySchema,
  searchRelevantAreasSchema,
  getTechnologyStackSchema,
  getRepositoryHealthSchema,
} from "@shipflow/validators";
import { RepositoryAgent } from "@shipflow/ai";
import { TRPCError } from "@trpc/server";
import { prisma } from "@shipflow/db";

export const githubRouter = router({
  /**
   * Connect an existing GitHub repository to a project.
   */
  connectRepository: workspaceProcedure
    .input(connectRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const repository = await prisma.repository.upsert({
          where: { projectId: input.projectId },
          create: {
            projectId: input.projectId,
            provider: "GITHUB",
            externalId: `${input.owner}/${input.name}`,
            name: input.name,
            owner: input.owner,
            defaultBranch: input.defaultBranch,
            webhookSecret: "{}", // Stores latest agent run reference as metadata JSON
          },
          update: {
            externalId: `${input.owner}/${input.name}`,
            name: input.name,
            owner: input.owner,
            defaultBranch: input.defaultBranch,
          },
        });
        return repository;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || String(error),
        });
      }
    }),

  /**
   * Run the Repository analyzer pipeline (hybridDeterministic + AI).
   */
  analyzeRepository: workspaceProcedure
    .input(analyzeRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await RepositoryAgent.analyzeRepository(
          input.repositoryId,
          input.workspaceId
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),

  /**
   * Retrieve the current repository summary.
   */
  getRepositorySummary: workspaceProcedure
    .input(getRepositorySummarySchema)
    .query(async ({ ctx, input }) => {
      try {
        const summary = await RepositoryAgent.getRepositorySummary(input.repositoryId);
        return { summary };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),

  /**
   * Retrieve technology stack details.
   */
  getTechnologyStack: workspaceProcedure
    .input(getTechnologyStackSchema)
    .query(async ({ ctx, input }) => {
      try {
        const stack = await RepositoryAgent.getTechnologyStack(input.repositoryId);
        return { stack };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),

  /**
   * Retrieve repository health metrics.
   */
  getRepositoryHealth: workspaceProcedure
    .input(getRepositoryHealthSchema)
    .query(async ({ ctx, input }) => {
      try {
        const health = await RepositoryAgent.getRepositoryHealth(input.repositoryId);
        return { health };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),

  /**
   * Perform semantic file ranking search against code structure.
   */
  searchRelevantAreas: workspaceProcedure
    .input(searchRelevantAreasSchema)
    .query(async ({ ctx, input }) => {
      try {
        const result = await RepositoryAgent.searchRelevantAreas(
          input.repositoryId,
          input.workspaceId,
          input.query,
          input.featureId
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),
});
