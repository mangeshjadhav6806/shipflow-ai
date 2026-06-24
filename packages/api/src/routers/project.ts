// =============================================================================
// ShipFlow AI — Project Router
// =============================================================================

import { router, workspaceProcedure } from "../trpc";
import { z } from "zod";
import { prisma } from "@shipflow/db";
import { TRPCError } from "@trpc/server";

export const projectRouter = router({
  create: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const project = await prisma.project.create({
          data: {
            workspaceId: input.workspaceId,
            name: input.name,
            description: input.description,
          },
        });
        return project;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const projects = await prisma.project.findMany({
          where: {
            workspaceId: input.workspaceId,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });
        return projects;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
    }),
});
