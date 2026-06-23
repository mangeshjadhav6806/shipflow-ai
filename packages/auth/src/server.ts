import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "./auth";

// =============================================================================
// ShipFlow AI — BetterAuth Server Utilities
// =============================================================================
// Server-only entry points for Next.js API handlers and session validation.
// =============================================================================

// BetterAuth instance
export { auth };

// Route handler
export const authHandler = toNextJsHandler(auth);

// Re-export server utilities for convenience
export {
  getSessionFromHeaders,
  isSessionValid,
  getUserId,
  isAuthenticated,
  getSessionExpiryTime,
  shouldRefreshSession,
} from "./session";

export {
  requireAuth,
  getAuth,
  withAuth,
  verifyProviderConnection,
  type AuthedRequest,
  type UnauthenticatedError,
} from "./middleware";

// Re-export RBAC services
export { PermissionService, PERMISSION_MATRIX } from "./permission-service";
export { RoleService, VALID_ROLES } from "./role-service";
export { WorkspaceService } from "./workspace-service";
export { MembershipService } from "./membership-service";
export { InvitationService } from "./invitation-service";

// Re-export authorization utilities
export { authorize } from "./authorization-middleware";
