import {
  router,
  protectedProcedure,
  createPermissionProcedure,
  workspaceProcedure,
} from "../trpc";
import {
  createInvitationSchema,
  acceptInvitationSchema,
  removeMemberSchema,
  leaveworkspaceSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
} from "@shipflow/validators";
import {
  InvitationService,
  MembershipService,
  PermissionService,
} from "@shipflow/auth/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@shipflow/db";

export const memberRouter = router({
  invite: createPermissionProcedure("canInviteMembers")
    .input(createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const invitation = await InvitationService.createInvitation(
          input.workspaceId,
          input.email,
          input.role
        );
        return invitation;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  accept: protectedProcedure
    .input(acceptInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const member = await InvitationService.acceptInvitation(
          input.token,
          ctx.user.id
        );
        return member;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  reject: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const invitation = await InvitationService.getInvitationByToken(input.token);
        await InvitationService.cancelInvitation(invitation.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  remove: createPermissionProcedure("canRemoveMembers")
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself. Use leave instead.",
        });
      }

      try {
        const targetMember = await MembershipService.getMember(
          input.workspaceId,
          input.userId
        );

        // Role hierarchy check
        const actorRole = ctx.workspaceContext!.role;
        const isHigher = PermissionService.isRoleHigher(actorRole, targetMember.role);

        if (!isHigher) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot remove a member with a role equal to or higher than yours",
          });
        }

        await MembershipService.removeMember(input.workspaceId, input.userId);
        return { success: true };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  leave: protectedProcedure
    .input(leaveworkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await MembershipService.leaveWorkspace(input.workspaceId, ctx.user.id);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  transferOwnership: createPermissionProcedure("canTransferOwnership")
    .input(transferOwnershipSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await MembershipService.transferOwnership(
          input.workspaceId,
          ctx.user.id,
          input.newOwnerId
        );
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  updateRole: createPermissionProcedure("canUpdateMemberRole")
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const actorRole = ctx.workspaceContext!.role;
        const member = await MembershipService.updateMemberRole(
          input.workspaceId,
          input.userId,
          input.role,
          actorRole
        );
        return member;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
    }),

  list: workspaceProcedure.query(async ({ ctx }) => {
    try {
      const members = await prisma.member.findMany({
        where: {
          workspaceId: ctx.workspaceContext!.workspace.id,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const invitations = await prisma.workspaceInvitation.findMany({
        where: {
          workspaceId: ctx.workspaceContext!.workspace.id,
          acceptedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        members: members.map((m) => ({
          id: m.id,
          workspaceId: m.workspaceId,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: m.user,
        })),
        invitations: invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          token: i.token,
          expiresAt: i.expiresAt,
          createdAt: i.createdAt,
        })),
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }
  }),
});
