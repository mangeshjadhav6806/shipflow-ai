// =============================================================================
// ShipFlow AI — Domain-Specific Errors
// =============================================================================
// Enterprise-grade error classes for workspace, membership, and authorization
// operations. Designed to be framework-agnostic and reusable across layers.
// =============================================================================

/**
 * Base error class for all ShipFlow domain errors.
 * Provides consistent error structure and metadata handling.
 */
export class ShipFlowError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      metadata: this.metadata,
    };
  }
}

/**
 * Thrown when a workspace cannot be found.
 * @example throw new WorkspaceNotFoundError("workspace-id-123");
 */
export class WorkspaceNotFoundError extends ShipFlowError {
  constructor(workspaceId: string) {
    super(
      "WORKSPACE_NOT_FOUND",
      `Workspace "${workspaceId}" not found`,
      404,
      { workspaceId }
    );
  }
}

/**
 * Thrown when a member cannot be found in a workspace.
 * @example throw new MemberNotFoundError("workspace-id", "user-id");
 */
export class MemberNotFoundError extends ShipFlowError {
  constructor(workspaceId: string, userId: string) {
    super(
      "MEMBER_NOT_FOUND",
      `Member not found in workspace`,
      404,
      { workspaceId, userId }
    );
  }
}

/**
 * Thrown when user does not have required permission.
 * @example throw new PermissionDeniedError("canDeleteWorkspace", "workspace-id");
 */
export class PermissionDeniedError extends ShipFlowError {
  constructor(permission: string, workspaceId: string) {
    super(
      "PERMISSION_DENIED",
      `You do not have permission: ${permission}`,
      403,
      { permission, workspaceId }
    );
  }
}

/**
 * Thrown when an invitation token is invalid or expired.
 * @example throw new InvitationExpiredError("token-abc123");
 */
export class InvitationExpiredError extends ShipFlowError {
  constructor(token: string) {
    super(
      "INVITATION_EXPIRED",
      `Invitation token is invalid or expired`,
      410,
      { token }
    );
  }
}

/**
 * Thrown when an invalid role is assigned.
 * @example throw new InvalidRoleError("SUPERUSER");
 */
export class InvalidRoleError extends ShipFlowError {
  constructor(role: string, validRoles?: string[]) {
    super(
      "INVALID_ROLE",
      `Role "${role}" is not valid`,
      400,
      { role, validRoles }
    );
  }
}

/**
 * Thrown when a workspace with the same slug already exists.
 * @example throw new WorkspaceAlreadyExistsError("my-workspace");
 */
export class WorkspaceAlreadyExistsError extends ShipFlowError {
  constructor(slug: string) {
    super(
      "WORKSPACE_ALREADY_EXISTS",
      `Workspace with slug "${slug}" already exists`,
      409,
      { slug }
    );
  }
}

/**
 * Thrown when user is already a member of a workspace.
 * @example throw new UserAlreadyMemberError("workspace-id", "user-id");
 */
export class UserAlreadyMemberError extends ShipFlowError {
  constructor(workspaceId: string, userId: string) {
    super(
      "USER_ALREADY_MEMBER",
      `User is already a member of this workspace`,
      409,
      { workspaceId, userId }
    );
  }
}

/**
 * Thrown when trying to perform an operation on the last owner.
 * @example throw new CannotRemoveLastOwnerError("workspace-id");
 */
export class CannotRemoveLastOwnerError extends ShipFlowError {
  constructor(workspaceId: string) {
    super(
      "CANNOT_REMOVE_LAST_OWNER",
      `Cannot remove the last owner from a workspace`,
      409,
      { workspaceId }
    );
  }
}

/**
 * Thrown when user tries to leave a workspace as the only owner.
 * @example throw new CannotLeaveAsLastOwnerError("workspace-id");
 */
export class CannotLeaveAsLastOwnerError extends ShipFlowError {
  constructor(workspaceId: string) {
    super(
      "CANNOT_LEAVE_AS_LAST_OWNER",
      `Cannot leave workspace as the only owner`,
      409,
      { workspaceId }
    );
  }
}

/**
 * Thrown when trying to transfer ownership to a non-member.
 * @example throw new TargetNotMemberError("workspace-id", "user-id");
 */
export class TargetNotMemberError extends ShipFlowError {
  constructor(workspaceId: string, userId: string) {
    super(
      "TARGET_NOT_MEMBER",
      `Target user is not a member of this workspace`,
      400,
      { workspaceId, userId }
    );
  }
}

/**
 * Thrown when organization cannot be found.
 * @example throw new OrganizationNotFoundError("org-id-123");
 */
export class OrganizationNotFoundError extends ShipFlowError {
  constructor(organizationId: string) {
    super(
      "ORGANIZATION_NOT_FOUND",
      `Organization "${organizationId}" not found`,
      404,
      { organizationId }
    );
  }
}
