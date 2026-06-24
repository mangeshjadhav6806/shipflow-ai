// =============================================================================
// ShipFlow AI — Planning Router
// =============================================================================

import { router, workspaceProcedure } from "../trpc";
import {
  generatePlanSchema,
  regeneratePlanSchema,
  getPlanSchema,
  getPlanningMetricsSchema,
} from "@shipflow/validators";
import { PlanningAgent } from "@shipflow/ai";
import { TRPCError } from "@trpc/server";

export const planningRouter = router({
  /**
   * Generate a new engineering plan for an approved PRD.
   */
  generatePlan: workspaceProcedure
    .input(generatePlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await PlanningAgent.generatePlan(input.prdId, input.workspaceId);
        return result;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Regenerate an engineering plan (creates a new run and updates tasks).
   */
  regeneratePlan: workspaceProcedure
    .input(regeneratePlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await PlanningAgent.regeneratePlan(input.prdId, input.workspaceId);
        return result;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Retrieve the full engineering plan (reconstructed from Tasks + ContextSnapshot).
   */
  getPlan: workspaceProcedure
    .input(getPlanSchema)
    .query(async ({ ctx, input }) => {
      try {
        const result = await PlanningAgent.getPlan(input.prdId);
        return result;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  /**
   * Retrieve overall planning metrics and milestones.
   */
  getPlanningMetrics: workspaceProcedure
    .input(getPlanningMetricsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const result = await PlanningAgent.getPlanningMetrics(input.prdId);
        return result;
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
