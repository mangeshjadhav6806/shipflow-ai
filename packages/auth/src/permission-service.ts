// =============================================================================
// ShipFlow AI — Permission Service
// =============================================================================
// Database-driven RBAC permission system.
// Defines which roles have which permissions and provides type-safe checking.
// =============================================================================

import type { PermissionMatrix, UserRole } from "@shipflow/types";

/**
 * Enterprise RBAC permission matrix.
 * Each permission lists the roles that have access.
 * This is the source of truth for all authorization checks.
 */
export const PERMISSION_MATRIX: PermissionMatrix = {
  // Workspace management
  canDeleteWorkspace: ["OWNER", "ADMIN"],
  canUpdateWorkspace: ["OWNER", "ADMIN"],
  canTransferOwnership: ["OWNER"],

  // Member management
  canInviteMembers: ["OWNER", "ADMIN"],
  canRemoveMembers: ["OWNER", "ADMIN"],
  canUpdateMemberRole: ["OWNER", "ADMIN"],
  canLeaveworkspace: ["OWNER", "ADMIN", "PM", "DEVELOPER", "REVIEWER", "VIEWER"],

  // Project management (placeholder for future)
  canCreateProject: ["OWNER", "ADMIN", "PM"],
  canDeleteProject: ["OWNER", "ADMIN", "PM"],
  canUpdateProject: ["OWNER", "ADMIN", "PM"],

  // Feature management (placeholder for future)
  canCreateFeature: ["OWNER", "ADMIN", "PM", "DEVELOPER"],
  canDeleteFeature: ["OWNER", "ADMIN", "PM"],
  canUpdateFeature: ["OWNER", "ADMIN", "PM", "DEVELOPER"],
  canReviewFeature: ["OWNER", "ADMIN", "REVIEWER"],

  // Repository management (placeholder for future)
  canManageRepositories: ["OWNER", "ADMIN"],
  canConnectRepository: ["OWNER", "ADMIN", "PM"],

  // AI management (placeholder for future)
  canManageAI: ["OWNER", "ADMIN"],
  canRunAIAgents: ["OWNER", "ADMIN", "PM", "DEVELOPER"],

  // Billing management (placeholder for future)
  canManageBilling: ["OWNER", "ADMIN"],
  canViewBilling: ["OWNER", "ADMIN"],

  // GitHub integration (placeholder for future)
  canManageGitHub: ["OWNER", "ADMIN"],
  canReviewPR: ["OWNER", "ADMIN", "REVIEWER", "DEVELOPER"],
  canMergePR: ["OWNER", "ADMIN"],
  canDeploy: ["OWNER", "ADMIN"],

  // Audit & Observability
  canViewAuditLogs: ["OWNER", "ADMIN"],
  canViewAnalytics: ["OWNER", "ADMIN"],

  // API & Integrations
  canManageAPIKeys: ["OWNER", "ADMIN"],
  canViewAPIKeys: ["OWNER", "ADMIN", "DEVELOPER"],
};

/**
 * PermissionService handles all RBAC checks.
 * Framework-agnostic and reusable across API layers.
 */
export class PermissionService {
  /**
   * Check if a role has a specific permission.
   * @param role User role to check
   * @param permission Permission name to verify
   * @returns true if role has permission, false otherwise
   */
  static hasPermission(role: UserRole, permission: string): boolean {
    const allowedRoles = PERMISSION_MATRIX[permission];
    if (!allowedRoles) {
      // Unknown permission - deny by default (secure fail)
      console.warn(`Unknown permission: ${permission}`);
      return false;
    }
    return allowedRoles.includes(role);
  }

  /**
   * Check if any role in a list has a permission.
   * Useful for checking multiple members.
   * @param roles Array of user roles to check
   * @param permission Permission name to verify
   * @returns true if any role has permission
   */
  static hasPermissionAny(roles: UserRole[], permission: string): boolean {
    return roles.some((role) => this.hasPermission(role, permission));
  }

  /**
   * Get all permissions a role has.
   * Useful for UI/capabilities queries.
   * @param role User role
   * @returns Array of permission names the role has
   */
  static getPermissionsForRole(role: UserRole): string[] {
    return Object.entries(PERMISSION_MATRIX)
      .filter(([, allowedRoles]) => allowedRoles.includes(role))
      .map(([permission]) => permission);
  }

  /**
   * Get all roles that have a specific permission.
   * Useful for debugging and auditing.
   * @param permission Permission name
   * @returns Array of roles that have this permission
   */
  static getRolesWithPermission(permission: string): UserRole[] {
    return (PERMISSION_MATRIX[permission] || []) as UserRole[];
  }

  /**
   * Check if a role can perform a role assignment.
   * Prevents privilege escalation.
   * @param actorRole Actor's role
   * @param targetRole Target role to assign
   * @returns true if actor can assign target role
   */
  static canAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
    // Only OWNER can assign roles higher than DEVELOPER
    const elevatedRoles: UserRole[] = ["OWNER", "ADMIN"];
    if (elevatedRoles.includes(targetRole) && actorRole !== "OWNER") {
      return false;
    }

    // ADMIN can assign any role except OWNER
    if (actorRole === "ADMIN") {
      return targetRole !== "OWNER";
    }

    // OWNER can assign any role
    if (actorRole === "OWNER") {
      return true;
    }

    // All other roles cannot assign roles
    return false;
  }

  /**
   * Get role hierarchy level (higher = more permissions).
   * Used for comparisons and validations.
   * @param role User role
   * @returns Hierarchy level (0-6)
   */
  static getRoleHierarchy(role: UserRole): number {
    const hierarchy: Record<UserRole, number> = {
      OWNER: 6,
      ADMIN: 5,
      PM: 4,
      DEVELOPER: 3,
      REVIEWER: 2,
      VIEWER: 1,
    };
    return hierarchy[role] ?? 0;
  }

  /**
   * Check if actor role is higher in hierarchy than target.
   * @param actorRole Actor's role
   * @param targetRole Target role to compare
   * @returns true if actor is higher in hierarchy
   */
  static isRoleHigher(actorRole: UserRole, targetRole: UserRole): boolean {
    return this.getRoleHierarchy(actorRole) > this.getRoleHierarchy(targetRole);
  }

  /**
   * Check if role is equal or higher in hierarchy.
   * @param actorRole Actor's role
   * @param targetRole Target role to compare
   * @returns true if actor is equal or higher
   */
  static isRoleEqualOrHigher(actorRole: UserRole, targetRole: UserRole): boolean {
    return this.getRoleHierarchy(actorRole) >= this.getRoleHierarchy(targetRole);
  }
}
