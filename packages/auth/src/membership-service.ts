// =============================================================================
// ShipFlow AI — Membership Service
// =============================================================================
// Business logic for managing workspace membership.
// Handles member addition, removal, role changes, and transfers.
// =============================================================================

import { prisma } from "@shipflow/db";
import type { Member, UserRole } from "@shipflow/types";
import {
  MemberNotFoundError,
  WorkspaceNotFoundError,
  UserAlreadyMemberError,
  CannotRemoveLastOwnerError,
  CannotLeaveAsLastOwnerError,
  TargetNotMemberError,
} from "@shipflow/shared";
import { PermissionService } from "./permission-service";
import { RoleService } from "./role-service";

/**
 * MembershipService handles workspace membership operations.
 */
export class MembershipService {
  /**
   * Add a member to a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @param role Role for the member
   * @returns Created member
   * @throws UserAlreadyMemberError if user is already a member
   */
  static async addMember(
    workspaceId: string,
    userId: string,
    role: UserRole = "VIEWER"
  ): Promise<Member> {
    // Validate workspace exists
    await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });

    // Check if already a member
    const existingMember = await prisma.member.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (existingMember) {
      throw new UserAlreadyMemberError(workspaceId, userId);
    }

    // Validate role
    RoleService.validateRole(role);

    // Create member
    const member = await prisma.member.create({
      data: {
        workspaceId,
        userId,
        role,
      },
    });

    return member as Member;
  }

  /**
   * Get a member from a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @returns Member
   * @throws MemberNotFoundError if not found
   */
  static async getMember(workspaceId: string, userId: string): Promise<Member> {
    const member = await prisma.member.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!member) {
      throw new MemberNotFoundError(workspaceId, userId);
    }

    return member as Member;
  }

  /**
   * Get all members of a workspace.
   * @param workspaceId Workspace ID
   * @returns Array of members
   */
  static async getWorkspaceMembers(workspaceId: string): Promise<Member[]> {
    const members = await prisma.member.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return members as Member[];
  }

  /**
   * Get all workspaces a user is a member of.
   * @param userId User ID
   * @returns Array of members
   */
  static async getUserMemberships(userId: string): Promise<Member[]> {
    const members = await prisma.member.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return members as Member[];
  }

  /**
   * Update a member's role.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @param newRole New role
   * @param actorRole Role of the person making the change (for permissions)
   * @returns Updated member
   */
  static async updateMemberRole(
    workspaceId: string,
    userId: string,
    newRole: UserRole,
    actorRole: UserRole
  ): Promise<Member> {
    // Get current member
    const member = await this.getMember(workspaceId, userId);

    // Validate new role
    RoleService.validateRole(newRole);

    // Check if actor can make this change
    if (!RoleService.canChangeRole(actorRole, member.role, newRole)) {
      throw new Error("Insufficient permissions to change member role");
    }

    // Update member
    const updated = await prisma.member.update({
      where: { id: member.id },
      data: { role: newRole },
    });

    return updated as Member;
  }

  /**
   * Remove a member from a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID to remove
   * @throws CannotRemoveLastOwnerError if removing the last owner
   */
  static async removeMember(workspaceId: string, userId: string): Promise<void> {
    // Get member to verify exists
    const member = await this.getMember(workspaceId, userId);

    // Check if this is the last owner
    if (member.role === "OWNER") {
      const ownerCount = await prisma.member.count({
        where: { workspaceId, role: "OWNER" },
      });

      if (ownerCount === 1) {
        throw new CannotRemoveLastOwnerError(workspaceId);
      }
    }

    // Soft delete member
    await prisma.member.update({
      where: { id: member.id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Transfer ownership to another member.
   * @param workspaceId Workspace ID
   * @param fromUserId Current owner
   * @param toUserId New owner
   */
  static async transferOwnership(
    workspaceId: string,
    fromUserId: string,
    toUserId: string
  ): Promise<void> {
    // Get both members
    const fromMember = await this.getMember(workspaceId, fromUserId);
    const toMember = await this.getMember(workspaceId, toUserId);

    // Verify sender is owner
    if (fromMember.role !== "OWNER") {
      throw new Error("Only owners can transfer ownership");
    }

    // Update both members
    await Promise.all([
      prisma.member.update({
        where: { id: fromMember.id },
        data: { role: "ADMIN" },
      }),
      prisma.member.update({
        where: { id: toMember.id },
        data: { role: "OWNER" },
      }),
    ]);
  }

  /**
   * User leaves a workspace.
   * @param workspaceId Workspace ID
   * @param userId User leaving
   */
  static async leaveWorkspace(workspaceId: string, userId: string): Promise<void> {
    // Get member
    const member = await this.getMember(workspaceId, userId);

    // Cannot leave as the last owner
    if (member.role === "OWNER") {
      const ownerCount = await prisma.member.count({
        where: { workspaceId, role: "OWNER" },
      });

      if (ownerCount === 1) {
        throw new CannotLeaveAsLastOwnerError(workspaceId);
      }
    }

    // Soft delete member
    await prisma.member.update({
      where: { id: member.id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get count of members by role in a workspace.
   * @param workspaceId Workspace ID
   * @returns Object with counts per role
   */
  static async getMemberCountsByRole(
    workspaceId: string
  ): Promise<Record<UserRole, number>> {
    const counts = await prisma.member.groupBy({
      by: ["role"],
      where: { workspaceId },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const count of counts) {
      result[count.role] = count._count;
    }

    return result as Record<UserRole, number>;
  }

  /**
   * Check if user is a member of a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @returns true if user is a member
   */
  static async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await prisma.member.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    return !!member && !member.deletedAt;
  }

  /**
   * Get user's role in a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @returns Role or null if not a member
   */
  static async getUserRole(workspaceId: string, userId: string): Promise<UserRole | null> {
    const member = await prisma.member.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    return member && !member.deletedAt ? member.role : null;
  }

  /**
   * Check if user has a specific permission in a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @param permission Permission to check
   * @returns true if user has permission
   */
  static async hasPermission(
    workspaceId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    const role = await this.getUserRole(workspaceId, userId);
    if (!role) return false;

    return PermissionService.hasPermission(role, permission);
  }
}
