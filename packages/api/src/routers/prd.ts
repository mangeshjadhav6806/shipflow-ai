// =============================================================================
// ShipFlow AI — PRD Router
// =============================================================================

import { router, workspaceProcedure } from "../trpc";
import {
  createPRDSchema,
  regeneratePRDSchema,
  getPRDSchema,
  listPRDVersionsSchema,
  comparePRDVersionsSchema,
} from "@shipflow/validators";
import { PRDAgent } from "@shipflow/ai";
import { TRPCError } from "@trpc/server";
import { prisma } from "@shipflow/db";
import type { PRDDocument } from "@shipflow/types";

export const prdRouter = router({
  /**
   * Generate a new PRD for an approved feature.
   * Feature must be in READY_FOR_PRD status.
   */
  createPRD: workspaceProcedure
    .input(createPRDSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await PRDAgent.generatePRD(input.featureId, input.workspaceId);
        return {
          prdId: result.prdId,
          version: result.version,
          featureId: result.featureId,
          agentRunId: result.agentRunId,
          markdownContent: result.markdownContent,
          document: result.document,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Regenerate a PRD (creates a new version).
   * Feature must be in READY_FOR_PRD or PRD_GENERATED status.
   */
  regeneratePRD: workspaceProcedure
    .input(regeneratePRDSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await PRDAgent.regeneratePRD(input.featureId, input.workspaceId);
        return {
          prdId: result.prdId,
          version: result.version,
          featureId: result.featureId,
          agentRunId: result.agentRunId,
          markdownContent: result.markdownContent,
          document: result.document,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Fetch the current PRD for a feature.
   */
  getPRD: workspaceProcedure
    .input(getPRDSchema)
    .query(async ({ ctx, input }) => {
      try {
        const prd = await prisma.pRD.findUnique({
          where: { featureId: input.featureId },
        });

        if (!prd) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No PRD found for feature ${input.featureId}`,
          });
        }

        const parsed = JSON.parse(prd.content) as {
          document?: PRDDocument;
          markdown?: string;
        };

        return {
          id: prd.id,
          featureId: prd.featureId,
          version: prd.version,
          document: parsed.document ?? null,
          markdownContent: parsed.markdown ?? "",
          createdAt: prd.createdAt,
          updatedAt: prd.updatedAt,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * List PRD version history for a feature.
   * Returns version metadata from AgentRun records (since schema stores only current).
   */
  listVersions: workspaceProcedure
    .input(listPRDVersionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Fetch the current PRD snapshot
        const prd = await prisma.pRD.findUnique({
          where: { featureId: input.featureId },
          select: {
            id: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            featureId: true,
          },
        });

        if (!prd) {
          return { versions: [], currentVersion: 0 };
        }

        // Enumerate all known versions from AgentRun logs for PRD_GENERATOR
        const agentRuns = await prisma.agentRun.findMany({
          where: {
            featureId: input.featureId,
            agentType: "PRD_GENERATOR",
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const versions = agentRuns
          .filter((run) => run.status === "SUCCESS")
          .map((run, index) => ({
            versionNumber: index + 1,
            agentRunId: run.id,
            createdAt: run.createdAt,
            isCurrent: index + 1 === prd.version,
          }));

        return {
          versions,
          currentVersion: prd.version,
          prdId: prd.id,
          featureId: prd.featureId,
          lastUpdated: prd.updatedAt,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Compare two PRD versions and return a structured JSON diff.
   */
  compareVersions: workspaceProcedure
    .input(comparePRDVersionsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const result = await PRDAgent.compareVersions(
          input.featureId,
          input.versionA,
          input.versionB
        );
        return result;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
