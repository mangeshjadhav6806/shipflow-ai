import { router, protectedProcedure } from "../trpc";
import { createOrganizationSchema, updateOrganizationSchema } from "@shipflow/validators";
import { OrganizationService } from "@shipflow/auth/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@shipflow/db";

export const organizationRouter = router({
  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const org = await OrganizationService.createOrganization(
          input.name,
          ctx.user.id,
          input.slug
        );
        return org;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  update: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      // Auth: Must be Owner or Admin in at least one of the workspaces under this organization
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

      const isAuthorized = memberships.some(
        (m) => m.role === "OWNER" || m.role === "ADMIN"
      );

      if (!isAuthorized) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners/admins can update this organization",
        });
      }

      try {
        const org = await OrganizationService.updateOrganization(
          input.organizationId,
          {
            name: input.name,
            slug: input.slug,
          }
        );
        return org;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Auth: Must be OWNER in at least one of the workspaces under this organization
      const memberships = await prisma.member.findMany({
        where: {
          userId: ctx.user.id,
          workspace: {
            organizationId: input.organizationId,
            deletedAt: null,
          },
          role: "OWNER",
          deletedAt: null,
        },
      });

      if (memberships.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization owners can delete this organization",
        });
      }

      try {
        const org = await OrganizationService.deleteOrganization(input.organizationId);
        return org;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  get: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Auth: Must be member of at least one workspace in the organization
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
          message: "You do not have access to this organization",
        });
      }

      try {
        const org = await OrganizationService.getOrganization(input.organizationId);
        return org;
      } catch (error: any) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: error.message,
        });
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const orgs = await OrganizationService.getUserOrganizations(ctx.user.id);
      return orgs;
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }
  }),
});
