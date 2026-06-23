// =============================================================================
// ShipFlow AI — BetterAuth Core Package Exports
// =============================================================================

// Configuration
export { authConfig } from "./config";

// Core types
export type { Auth, Session, User } from "./auth";

// Session utilities
export {
  getSessionFromHeaders,
  isSessionValid,
  getUserId,
  isAuthenticated,
  getSessionExpiryTime,
  shouldRefreshSession,
} from "./session";

// Middleware utilities
export {
  requireAuth,
  getAuth,
  withAuth,
  verifyProviderConnection,
  type AuthedRequest,
  type UnauthenticatedError,
} from "./middleware";

// RBAC & Services
export { PermissionService, PERMISSION_MATRIX } from "./permission-service";
export { RoleService, VALID_ROLES } from "./role-service";
export { WorkspaceService } from "./workspace-service";
export { MembershipService } from "./membership-service";
export { InvitationService } from "./invitation-service";

// Authorization utilities
export { authorize } from "./authorization-middleware";
