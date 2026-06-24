// =============================================================================
// ShipFlow AI — Discovery Router
// =============================================================================

import { router, workspaceProcedure } from "../trpc";
import { submitRequestSchema, answerClarificationSchema } from "@shipflow/validators";
import { DiscoveryAgent, AIObservability, type AgentRunMetrics } from "@shipflow/ai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@shipflow/db";

export const discoveryRouter = router({
  submitRequest: workspaceProcedure
    .input(submitRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await DiscoveryAgent.submitRequest(
          input.rawText,
          input.projectId,
          input.workspaceId
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || String(error),
        });
      }
    }),

  answerClarification: workspaceProcedure
    .input(answerClarificationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await DiscoveryAgent.answerClarification(
          input.featureId,
          input.answers,
          input.workspaceId
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || String(error),
        });
      }
    }),

  getFeatureDetails: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        featureId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const feature = await prisma.feature.findUnique({
          where: { id: input.featureId },
          include: {
            questions: {
              include: {
                answer: true,
              },
              orderBy: { orderIndex: "asc" },
            },
            prd: true,
            agentRuns: {
              orderBy: { createdAt: "desc" },
              include: {
                logs: {
                  orderBy: { createdAt: "asc" },
                },
                tokenUsages: true,
                retries: true,
              },
            },
          },
        });

        if (!feature) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Feature with ID ${input.featureId} not found`,
          });
        }

        // Fetch observability metrics for each run
        const runMetrics = await Promise.all(
          feature.agentRuns.map(async (run) => {
            try {
              return await AIObservability.getAgentRunMetrics(run.id);
            } catch {
              return null;
            }
          })
        );

        return {
          feature: {
            id: feature.id,
            title: feature.title,
            description: feature.description,
            status: feature.status,
            questions: feature.questions.map((q) => ({
              id: q.id,
              question: q.question,
              options: q.options ? (q.options as string[]) : null,
              answer: q.answer
                ? {
                    id: q.answer.id,
                    answer: q.answer.answer,
                  }
                : null,
            })),
            prd: feature.prd
              ? {
                  id: feature.prd.id,
                  version: feature.prd.version,
                  content: feature.prd.content,
                }
              : null,
            agentRuns: feature.agentRuns.map((run) => ({
              id: run.id,
              agentType: run.agentType,
              status: run.status,
              logs: run.logs.map((l) => ({
                id: l.id,
                logLevel: l.logLevel,
                message: l.message,
              })),
            })),
          },
          metrics: runMetrics.filter((m): m is AgentRunMetrics => m !== null),
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),

  listFeatures: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const features = await prisma.feature.findMany({
          where: {
            workspaceId: input.workspaceId,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
          include: {
            questions: {
              include: {
                answer: true,
              },
            },
          },
        });
        return features.map((f) => ({
          id: f.id,
          title: f.title,
          description: f.description,
          status: f.status,
          questions: f.questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options ? (q.options as string[]) : null,
            answer: q.answer
              ? {
                  id: q.answer.id,
                  answer: q.answer.answer,
                }
              : null,
          })),
        }));
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || String(error),
        });
      }
    }),
});
