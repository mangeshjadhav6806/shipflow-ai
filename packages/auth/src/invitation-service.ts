// =============================================================================
// ShipFlow AI — Invitation Service
// =============================================================================
// Business logic for workspace invitations.
// Handles creation, acceptance, and expiration of invitations.
// =============================================================================

import { prisma } from "@shipflow/db";
import type { WorkspaceInvitation, UserRole } from "@shipflow/types";
import {
  WorkspaceNotFoundError,
  InvitationExpiredError,
  MemberNotFoundError,
  UserAlreadyMemberError,
} from "@shipflow/shared";
import { MembershipService } from "./membership-service";
import { RoleService } from "./role-service";

/**
 * Generate a cryptographically secure random token for invitations.
 * Uses 32 bytes = 256 bits of entropy.
 * @returns URL-safe token string
 */
function generateInvitationToken(): string {
  return require("crypto").randomBytes(32).toString("hex");
}

/**
 * InvitationService handles workspace invitation lifecycle.
 */
export class InvitationService {
  /**
   * Create a new invitation to join a workspace.
   * @param workspaceId Workspace ID
   * @param email Email address to invite
   * @param role Role for the invited member
   * @param expirationDays Days until invitation expires (default 14)
   * @returns Created invitation
   */
  static async createInvitation(
    workspaceId: string,
    email: string,
    role: UserRole = "VIEWER",
    expirationDays: number = 14
  ): Promise<WorkspaceInvitation> {
    // Verify workspace exists
    await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });

    // Validate role
    RoleService.validateRole(role);

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Generate secure token
    const token = generateInvitationToken();

    // Create invitation
    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        token,
        expiresAt,
      },
    });

    return invitation as WorkspaceInvitation;
  }

  /**
   * Get an invitation by ID.
   * @param invitationId Invitation ID
   * @returns Invitation
   */
  static async getInvitation(invitationId: string): Promise<WorkspaceInvitation> {
    const invitation = await prisma.workspaceInvitation.findUniqueOrThrow({
      where: { id: invitationId },
    });

    return invitation as WorkspaceInvitation;
  }

  /**
   * Get an invitation by token.
   * @param token Invitation token
   * @returns Invitation
   * @throws InvitationExpiredError if token not found
   */
  static async getInvitationByToken(token: string): Promise<WorkspaceInvitation> {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new InvitationExpiredError(token);
    }

    return invitation as WorkspaceInvitation;
  }

  /**
   * Check if an invitation is valid (not expired, not accepted).
   * @param invitation Invitation to check
   * @returns true if invitation is valid
   */
  static isInvitationValid(invitation: WorkspaceInvitation): boolean {
    const now = new Date();
    return invitation.expiresAt > now && !invitation.acceptedAt;
  }

  /**
   * Accept an invitation and add user to workspace.
   * @param token Invitation token
   * @param userId User ID accepting the invitation
   * @returns Created member
   * @throws InvitationExpiredError if invitation is expired
   */
  static async acceptInvitation(token: string, userId: string) {
    // Get invitation by token
    const invitation = await this.getInvitationByToken(token);

    // Check if invitation is still valid
    if (!this.isInvitationValid(invitation)) {
      throw new InvitationExpiredError(token);
    }

    // Check if user is already a member
    let isMember = false;
    try {
      await MembershipService.getMember(invitation.workspaceId, userId);
      isMember = true;
    } catch (error) {
      if (error instanceof MemberNotFoundError) {
        // Expected - user is not yet a member
        isMember = false;
      } else {
        throw error;
      }
    }

    if (isMember) {
      throw new UserAlreadyMemberError(invitation.workspaceId, userId);
    }

    // Add user to workspace with invitation role
    const member = await MembershipService.addMember(
      invitation.workspaceId,
      userId,
      invitation.role
    );

    // Mark invitation as accepted
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return member;
  }

  /**
   * Get all pending invitations for a workspace.
   * @param workspaceId Workspace ID
   * @returns Array of pending invitations
   */
  static async getPendingInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations as WorkspaceInvitation[];
  }

  /**
   * Get invitation by email in a workspace.
   * @param workspaceId Workspace ID
   * @param email Email address
   * @returns Invitation or null
   */
  static async getInvitationByEmail(
    workspaceId: string,
    email: string
  ): Promise<WorkspaceInvitation | null> {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: {
        workspaceId_email: { workspaceId, email },
      },
    });

    return invitation as WorkspaceInvitation | null;
  }

  /**
   * Cancel an invitation.
   * @param invitationId Invitation ID
   */
  static async cancelInvitation(invitationId: string): Promise<void> {
    const invitation = await this.getInvitation(invitationId);

    // Mark as accepted with past date to prevent acceptance
    await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date(0) }, // Epoch as marker for cancellation
    });
  }

  /**
   * Resend an invitation (generate new token).
   * @param invitationId Invitation ID
   * @param expirationDays Days until new invitation expires
   * @returns Updated invitation with new token
   */
  static async resendInvitation(
    invitationId: string,
    expirationDays: number = 14
  ): Promise<WorkspaceInvitation> {
    const invitation = await this.getInvitation(invitationId);

    // Generate new token
    const newToken = generateInvitationToken();

    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Update invitation
    const updated = await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt,
        acceptedAt: null, // Reset acceptance if it was marked
      },
    });

    return updated as WorkspaceInvitation;
  }

  /**
   * Clean up expired invitations.
   * Can be called periodically to remove old expired invitations.
   * @returns Number of cleaned invitations
   */
  static async cleanupExpiredInvitations(): Promise<number> {
    const result = await prisma.workspaceInvitation.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        acceptedAt: null,
      },
    });

    return result.count;
  }
}
