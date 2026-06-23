// =============================================================================
// ShipFlow AI — Role Service
// =============================================================================
// Business logic for role validation and management.
// Handles role transitions and hierarchy enforcement.
// =============================================================================

import type { UserRole } from "@shipflow/types";
import { InvalidRoleError } from "@shipflow/shared";
import { PermissionService } from "./permission-service";

export const VALID_ROLES: UserRole[] = ["OWNER", "ADMIN", "PM", "DEVELOPER", "REVIEWER", "VIEWER"];

/**
 * RoleService handles role validation and transitions.
 */
export class RoleService {
  /**
   * Validate that a role string is a valid UserRole.
   * @param role Role to validate
   * @throws InvalidRoleError if role is invalid
   * @returns role as UserRole
   */
  static validateRole(role: unknown): UserRole {
    if (typeof role !== "string") {
      throw new InvalidRoleError(String(role), VALID_ROLES);
    }

    if (!VALID_ROLES.includes(role as UserRole)) {
      throw new InvalidRoleError(role, VALID_ROLES);
    }

    return role as UserRole;
  }

  /**
   * Check if actor can perform a role change.
   * @param actorRole Role of the person making the change
   * @param currentRole Current role of the target member
   * @param newRole Desired new role for the target
   * @returns true if change is allowed
   */
  static canChangeRole(
    actorRole: UserRole,
    currentRole: UserRole,
    newRole: UserRole
  ): boolean {
    // Actor must be higher in hierarchy than current role
    if (!PermissionService.isRoleHigher(actorRole, currentRole)) {
      return false;
    }

    // Actor must be able to assign the new role
    return PermissionService.canAssignRole(actorRole, newRole);
  }

  /**
   * Get available roles for assignment based on actor's role.
   * @param actorRole Role of the person making assignments
   * @returns Array of assignable roles
   */
  static getAssignableRoles(actorRole: UserRole): UserRole[] {
    if (actorRole === "OWNER") {
      // Owner can assign any role
      return VALID_ROLES;
    }

    if (actorRole === "ADMIN") {
      // Admin can assign any role except OWNER
      return VALID_ROLES.filter((role) => role !== "OWNER");
    }

    // All other roles cannot assign roles
    return [];
  }

  /**
   * Get default role for new members.
   * @returns Default role (VIEWER)
   */
  static getDefaultRole(): UserRole {
    return "VIEWER";
  }

  /**
   * Get all valid roles for dropdowns/selections.
   * Can be filtered based on actor's role.
   * @param filterByActor Optional role to filter by
   * @returns Array of valid roles
   */
  static getAvailableRoles(filterByActor?: UserRole): UserRole[] {
    if (filterByActor) {
      return this.getAssignableRoles(filterByActor);
    }
    return VALID_ROLES;
  }

  /**
   * Check if role is considered "admin-like" (has elevated permissions).
   * @param role Role to check
   * @returns true if role is OWNER or ADMIN
   */
  static isAdminRole(role: UserRole): boolean {
    return role === "OWNER" || role === "ADMIN";
  }

  /**
   * Check if role can view sensitive workspace data.
   * @param role Role to check
   * @returns true if role can view audit logs, analytics, etc.
   */
  static canViewSensitiveData(role: UserRole): boolean {
    return role === "OWNER" || role === "ADMIN";
  }
}
