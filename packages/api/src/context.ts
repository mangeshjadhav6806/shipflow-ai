import { getSessionFromHeaders } from "@shipflow/auth/server";
import type { AuthContext, WorkspaceContext } from "@shipflow/types";

// =============================================================================
// ShipFlow AI — tRPC Context Creator
// =============================================================================
// This helper extracts authentication headers, queries BetterAuth for session
// state, and builds the tRPC procedure context.
// =============================================================================

export async function createContext(opts?: { req: Request }): Promise<Context> {
  const req = opts?.req;
  if (!req) {
    return {
      session: null,
      user: null,
      workspaceContext: null,
    };
  }

  try {
    const sessionData = await getSessionFromHeaders(req.headers);

    return {
      session: sessionData?.session ?? null,
      user: sessionData?.user ?? null,
      workspaceContext: null, // Set by workspace middleware
    };
  } catch (error) {
    console.error("[tRPC Context] Error fetching session:", error);
    return {
      session: null,
      user: null,
      workspaceContext: null,
    };
  }
}

export interface Context extends AuthContext {
  workspaceContext: WorkspaceContext | null;
}

export type ContextType = Awaited<ReturnType<typeof createContext>>;
