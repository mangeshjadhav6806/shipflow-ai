import { getSessionFromHeaders, isAuthenticated, type AuthSessionData } from "./session";
import type { Session, User } from "./auth";

// =============================================================================
// ShipFlow AI — Authentication Middleware Utilities
// =============================================================================
// Reusable helpers for protecting Next.js API routes and middleware.
// These provide a clean interface for session validation.
// =============================================================================

export interface AuthedRequest {
  session: Session;
  user: User;
  headers: Headers | Record<string, string>;
}

export interface UnauthenticatedError {
  code: "UNAUTHORIZED" | "INVALID_SESSION" | "SESSION_EXPIRED";
  message: string;
}

/**
 * Verify authentication in an API route handler.
 * Throws an error if not authenticated.
 *
 * Usage:
 * ```typescript
 * export async function POST(req: Request) {
 *   const auth = await requireAuth(req);
 *   // Now use auth.session, auth.user, auth.headers
 * }
 * ```
 *
 * @param request - Next.js Request object
 * @returns AuthedRequest with session and user
 * @throws Error with code and message if not authenticated
 */
export async function requireAuth(request: Request): Promise<AuthedRequest> {
  const headers = request.headers;
  const sessionData = await getSessionFromHeaders(headers);

  if (!isAuthenticated(sessionData)) {
    const error = new Error("Unauthorized") as Error & UnauthenticatedError;
    error.code = "UNAUTHORIZED";
    error.message = "You must be logged in to access this resource";
    throw error;
  }

  return {
    session: sessionData.session,
    user: sessionData.user,
    headers,
  };
}

/**
 * Optionally get authentication from a request.
 * Returns null if not authenticated instead of throwing.
 *
 * Usage:
 * ```typescript
 * export async function GET(req: Request) {
 *   const auth = await getAuth(req);
 *   if (auth) {
 *     // Authenticated
 *   } else {
 *     // Public endpoint
 *   }
 * }
 * ```
 *
 * @param request - Next.js Request object
 * @returns AuthedRequest or null
 */
export async function getAuth(request: Request): Promise<AuthedRequest | null> {
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}

/**
 * Create a protected API route handler wrapper.
 * Handles auth validation and error responses automatically.
 *
 * Usage:
 * ```typescript
 * export const POST = withAuth(async (req, auth) => {
 *   return Response.json({ userId: auth.user.id });
 * });
 * ```
 *
 * @param handler - Handler function that receives auth context
 * @returns API route handler
 */
export function withAuth(
  handler: (req: Request, auth: AuthedRequest) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      const auth = await requireAuth(req);
      return await handler(req, auth);
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        return new Response(
          JSON.stringify({
            error: (error as UnauthenticatedError).code,
            message: error.message,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.error("[withAuth] Unexpected error:", error);
      return new Response(
        JSON.stringify({
          error: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
}

/**
 * Create a route handler that validates OAuth provider connections.
 * Checks if user has connected a specific provider.
 *
 * @param request - Next.js Request object
 * @param provider - OAuth provider name (e.g., "github", "google")
 * @returns User object if connected, null otherwise
 */
export async function verifyProviderConnection(
  request: Request,
  provider: "github" | "google"
): Promise<User | null> {
  try {
    const auth = await requireAuth(request);
    // In future: Check if user has Account record for this provider
    // For now, just verify authenticated state
    return auth.user;
  } catch {
    return null;
  }
}
