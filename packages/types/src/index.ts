// =============================================================================
// ShipFlow AI — Shared Type Definitions
// =============================================================================

/**
 * Core user interface used across the application.
 * For full type safety, import Session and User from @shipflow/auth
 */
export interface User {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Session data structure for authentication context.
 * Mirrors BetterAuth session structure.
 */
export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication context passed through tRPC and middleware.
 */
export interface AuthContext {
  session: Session | null;
  user: User | null;
}

// Re-export workspace types
export * from "./workspace";
export * from "./discovery";



