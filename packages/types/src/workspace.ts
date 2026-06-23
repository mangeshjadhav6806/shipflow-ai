// =============================================================================
// ShipFlow AI — Workspace & Member Type Definitions
// =============================================================================
// Core types for workspace, member, and role-based access control.
// Defined centrally to prevent circular dependencies.
// =============================================================================

export type UserRole = "OWNER" | "ADMIN" | "PM" | "DEVELOPER" | "REVIEWER" | "VIEWER";

/**
 * Workspace entity. Represents a logical isolation unit for all tenant data.
 */
export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Organization entity. Top-level billing and ownership.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Member entity. Represents a user's membership in a workspace with a role.
 */
export interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Pending invitation for a user to join a workspace.
 */
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

/**
 * Workspace context for a user.
 * Used to track the currently active workspace and member role.
 */
export interface WorkspaceContext {
  workspace: Workspace;
  member: Member;
  role: UserRole;
}

/**
 * Permission definition. Maps a permission name to required roles.
 * Used by the PermissionService to check if a role has a permission.
 */
export interface PermissionDefinition {
  name: string;
  requiredRoles: UserRole[];
  description?: string;
}

/**
 * RBAC matrix defining which roles have which permissions.
 * This is the source of truth for all permission checks.
 */
export type PermissionMatrix = {
  [permission: string]: UserRole[];
};
