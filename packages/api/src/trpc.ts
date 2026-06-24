import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { MembershipService, PermissionService, WorkspaceService } from "@shipflow/auth/server";
import { WorkspaceNotFoundError, MemberNotFoundError } from "@shipflow/shared";
import type { UserRole } from "@shipflow/types";
import { prisma } from "@shipflow/db";

// =============================================================================
// ShipFlow AI — tRPC Initialization & Procedures
// =============================================================================

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication.
 * Throws UNAUTHORIZED error if user is not logged in.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Middleware that ensures user is authenticated and provides typed context.
 */
export const withAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Workspace procedure that extracts workspace ID/slug from headers or input,
 * resolves current Organization, Workspace, Membership, Role, and Permissions,
 * and attaches them to context.
 */
export const workspaceProcedure = protectedProcedure.use(async ({ ctx, next, input }) => {
  try {
    const workspaceId =
      (input as any)?.workspaceId ||
      ctx.headers.get("x-workspace-id") ||
      undefined;

    const workspaceSlug =
      (input as any)?.workspaceSlug ||
      ctx.headers.get("x-workspace-slug") ||
      undefined;

    if (!workspaceId && !workspaceSlug) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "workspaceId or workspaceSlug is required in input or headers (x-workspace-id / x-workspace-slug)",
      });
    }

    let workspace;
    if (workspaceId) {
      workspace = await WorkspaceService.getWorkspace(workspaceId);
    } else {
      workspace = await WorkspaceService.getWorkspaceBySlug(workspaceSlug!);
    }

    if (workspace.deletedAt) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workspace not found",
      });
    }

    // Resolve organization
    const org = await prisma.organization.findUnique({
      where: { id: workspace.organizationId },
    });

    if (!org || org.deletedAt) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // Check membership and get role
    const member = await MembershipService.getMember(workspace.id, ctx.user.id);
    if (member.deletedAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this workspace",
      });
    }

    const permissions = PermissionService.getPermissionsForRole(member.role);

    return next({
      ctx: {
        ...ctx,
        orgContext: {
          organization: org as any,
        },
        workspaceContext: {
          workspace: workspace as any,
          member: member as any,
          role: member.role,
          permissions,
        },
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof WorkspaceNotFoundError) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Workspace not found",
      });
    }
    if (error instanceof MemberNotFoundError) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this workspace",
      });
    }
    throw error;
  }
});

/**
 * Backwards compatible function version of workspaceProcedure.
 */
export function createWorkspaceProcedure() {
  return workspaceProcedure;
}

/**
 * Create a procedure that requires a specific permission.
 */
export function createPermissionProcedure(requiredPermission: string) {
  return workspaceProcedure.use(({ ctx, next }) => {
    if (!ctx.workspaceContext) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Workspace context is required",
      });
    }

    const hasPermission = PermissionService.hasPermission(
      ctx.workspaceContext.role,
      requiredPermission
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permission denied: ${requiredPermission}`,
      });
    }

    return next({ ctx });
  });
}

/**
 * Create a procedure that requires a specific role.
 */
export function createRoleProcedure(requiredRole: UserRole) {
  return workspaceProcedure.use(({ ctx, next }) => {
    if (!ctx.workspaceContext) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Workspace context is required",
      });
    }

    if (ctx.workspaceContext.role !== requiredRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This operation requires the ${requiredRole} role`,
      });
    }

    return next({ ctx });
  });
}
