// =============================================================================
// ShipFlow AI — Authorization Utilities
// =============================================================================
// Framework-agnostic authorization utilities for workspace, role, and
// permission checks. Can be used with tRPC procedures and API handlers.
// =============================================================================

import type { UserRole } from "@shipflow/types";
import { MembershipService } from "./membership-service";
import { PermissionService } from "./permission-service";

/**
 * Standalone authorization check utilities.
 * Can be used outside of middleware (e.g., in services, utils).
 */
export const authorize = {
  /**
   * Check if user is a member of a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @returns true if user is a member
   */
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    try {
      return await MembershipService.isMember(workspaceId, userId);
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if user has a specific permission.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @param permission Permission name
   * @returns true if user has permission
   */
  async hasPermission(
    workspaceId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    try {
      return await MembershipService.hasPermission(workspaceId, userId, permission);
    } catch (error) {
      return false;
    }
  },

  /**
   * Get user's role in a workspace.
   * @param workspaceId Workspace ID
   * @param userId User ID
   * @returns Role or null if not a member
   */
  async getRole(workspaceId: string, userId: string): Promise<UserRole | null> {
    try {
      return await MembershipService.getUserRole(workspaceId, userId);
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user can perform an action based on role and permission.
   * @param role User's role
   * @param permission Permission name
   * @returns true if role has permission
   */
  hasRolePermission(role: UserRole, permission: string): boolean {
    return PermissionService.hasPermission(role, permission);
  },

  /**
   * Get all permissions for a role.
   * @param role User role
   * @returns Array of permission names
   */
  getPermissionsForRole(role: UserRole): string[] {
    return PermissionService.getPermissionsForRole(role);
  },

  /**
   * Check if a role can assign another role.
   * @param actorRole Role of the person making assignment
   * @param targetRole Role to assign
   * @returns true if actor can assign target role
   */
  canAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
    return PermissionService.canAssignRole(actorRole, targetRole);
  },
};
