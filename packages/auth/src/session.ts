import { auth } from "./auth";
import type { Session, User } from "./auth";

// =============================================================================
// ShipFlow AI — Session Management Utilities
// =============================================================================
// Server-side helper functions for session validation and retrieval.
// These utilities are used in middleware, tRPC procedures, and API handlers.
// =============================================================================

export type AuthSessionData = { session: Session; user: User };

/**
 * Retrieve the current session from HTTP headers.
 * Designed for use in API route handlers and middleware.
 *
 * @param headers - Request headers containing auth cookies
 * @returns Session object with user data, or null if not authenticated
 */
export async function getSessionFromHeaders(
  headers: Headers | Record<string, string>
): Promise<AuthSessionData | null> {
  try {
    const result: unknown = await auth.api.getSession({
      headers,
    });

    // Type-safe extraction of session and user from BetterAuth response
    if (
      result &&
      typeof result === "object" &&
      "session" in result &&
      "user" in result &&
      result.session &&
      result.user
    ) {
      return {
        session: result.session as Session,
        user: result.user as User,
      };
    }

    return null;
  } catch (error) {
    console.error("[getSessionFromHeaders] Error:", error);
    return null;
  }
}

/**
 * Type guard to check if a session exists and is valid.
 * Useful for protecting procedures and API handlers.
 *
 * @param sessionData - Session data object to validate
 * @returns true if session is valid and not expired
 */
export function isSessionValid(sessionData: AuthSessionData | null): sessionData is AuthSessionData {
  if (!sessionData?.session) return false;
  const expiresAt = (sessionData.session as Record<string, unknown>).expiresAt as Date;
  return expiresAt > new Date();
}

/**
 * Extract userId from session with type safety.
 * Returns null if session is invalid or expired.
 *
 * @param sessionData - Session data containing session object
 * @returns user ID as string, or null if invalid
 */
export function getUserId(sessionData: AuthSessionData | null): string | null {
  if (!sessionData?.session) return null;
  const userId = (sessionData.session as Record<string, unknown>).userId as string | undefined;
  return userId ?? null;
}

/**
 * Check if a user is authenticated.
 * Convenience wrapper for session existence checks.
 *
 * @param sessionData - Session data to check
 * @returns true if user is authenticated
 */
export function isAuthenticated(sessionData: AuthSessionData | null): sessionData is AuthSessionData {
  return isSessionValid(sessionData);
}

/**
 * Get time until session expiry in milliseconds.
 * Useful for logging and diagnostics.
 *
 * @param sessionData - Session data to check
 * @returns milliseconds until expiry, or 0 if expired
 */
export function getSessionExpiryTime(sessionData: AuthSessionData | null): number {
  if (!sessionData?.session) return 0;
  const expiresAt = (sessionData.session as Record<string, unknown>).expiresAt as Date;
  const now = new Date();
  return Math.max(0, expiresAt.getTime() - now.getTime());
}

/**
 * Check if session is close to expiry and should be refreshed.
 * Returns true if session expires in less than 1 day.
 *
 * @param sessionData - Session data to check
 * @returns true if session should be refreshed
 */
export function shouldRefreshSession(sessionData: AuthSessionData | null): boolean {
  const expiryTime = getSessionExpiryTime(sessionData);
  const oneDayMs = 24 * 60 * 60 * 1000;
  return expiryTime > 0 && expiryTime < oneDayMs;
}
