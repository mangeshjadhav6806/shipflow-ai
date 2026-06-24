import {
  router,
  protectedProcedure,
  createPermissionProcedure,
  workspaceProcedure,
} from "../trpc";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  deleteWorkspaceSchema,
} from "@shipflow/validators";
import { WorkspaceService, MembershipService } from "@shipflow/auth/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@shipflow/db";

export const workspaceRouter = router({
  create: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      // Auth: Must be a member of at least one workspace in this organization
      const memberships = await prisma.member.findMany({
        where: {
          userId: ctx.user.id,
          workspace: {
            organizationId: input.organizationId,
            deletedAt: null,
          },
          deletedAt: null,
        },
      });

      if (memberships.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must belong to this organization to create a workspace",
        });
      }

      try {
        const workspace = await WorkspaceService.createWorkspace(
          input.organizationId,
          input.name,
          input.slug
        );

        // Creator becomes OWNER of the new workspace
        await MembershipService.addMember(workspace.id, ctx.user.id, "OWNER");

        return workspace;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  update: createPermissionProcedure("canUpdateWorkspace")
    .input(updateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await WorkspaceService.updateWorkspace(
          input.workspaceId,
          {
            name: input.name,
            slug: input.slug,
          }
        );
        return workspace;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  delete: createPermissionProcedure("canDeleteWorkspace")
    .input(deleteWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await WorkspaceService.deleteWorkspace(input.workspaceId);
        return workspace;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  archive: createPermissionProcedure("canDeleteWorkspace")
    .input(deleteWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const workspace = await WorkspaceService.deleteWorkspace(input.workspaceId);
        return workspace;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  restore: protectedProcedure
    .input(deleteWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      // Must bypass workspaceProcedure because it rejects archived/deleted workspaces.
      // We manually verify active membership and elevated role.
      try {
        const member = await MembershipService.getMember(input.workspaceId, ctx.user.id);
        if (member.deletedAt) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a member of this workspace",
          });
        }

        if (member.role !== "OWNER" && member.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only owners or admins can restore this workspace",
          });
        }

        const workspace = await WorkspaceService.restoreWorkspace(input.workspaceId);
        return workspace;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  list: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const workspaces = await prisma.workspace.findMany({
          where: {
            organizationId: input.organizationId,
            deletedAt: null,
            members: {
              some: {
                userId: ctx.user.id,
                deletedAt: null,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });
        return workspaces;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
    }),
});
