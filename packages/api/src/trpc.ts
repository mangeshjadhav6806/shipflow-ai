import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { MembershipService, PermissionService } from "@shipflow/auth/server";
import { WorkspaceNotFoundError, MemberNotFoundError } from "@shipflow/shared";
import type { UserRole } from "@shipflow/types";

// =============================================================================
// ShipFlow AI — tRPC Initialization
// =============================================================================
// Enforces TypeScript types for tRPC context and provides standard wrappers
// for both public (unauthenticated) and protected (authenticated) procedures.
// =============================================================================

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure that requires authentication.
 * Throws UNAUTHORIZED error if user is not logged in.
 * Safe to use for any authenticated operations.
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
 * Can be composed with other middleware for additional checks.
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
 * Create a workspace-aware procedure.
 * Requires workspaceId in input and validates membership.
 * Usage: export const myProcedure = createWorkspaceProcedure();
 */
export function createWorkspaceProcedure() {
  return protectedProcedure.use(async ({ ctx, next, input }) => {
    try {
      const workspaceId = (input as any)?.workspaceId;
      if (!workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "workspaceId is required",
        });
      }

      // Check membership and get role
      const role = await MembershipService.getUserRole(workspaceId, ctx.user!.id);

      if (!role) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const member = await MembershipService.getMember(workspaceId, ctx.user!.id);

      return next({
        ctx: {
          ...ctx,
          workspaceContext: {
            workspace: { id: workspaceId } as any, // Lazy load full workspace
            member,
            role,
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
}

/**
 * Create a procedure that requires a specific permission.
 * Usage: export const myProcedure = createPermissionProcedure("canDeleteWorkspace");
 */
export function createPermissionProcedure(requiredPermission: string) {
  return createWorkspaceProcedure().use(({ ctx, next }) => {
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
 * Usage: export const myProcedure = createRoleProcedure("OWNER");
 */
export function createRoleProcedure(requiredRole: UserRole) {
  return createWorkspaceProcedure().use(({ ctx, next }) => {
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
