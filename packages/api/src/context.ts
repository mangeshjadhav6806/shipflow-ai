import { getSessionFromHeaders } from "@shipflow/auth/server";
import type { AuthContext, Workspace, Organization, Member, UserRole, WorkspaceContext } from "@shipflow/types";

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
      orgContext: null,
      headers: new Headers(),
    };
  }

  try {
    const sessionData = await getSessionFromHeaders(req.headers);

    return {
      session: sessionData?.session ?? null,
      user: sessionData?.user ?? null,
      workspaceContext: null, // Resolved inside procedures/middleware
      orgContext: null,       // Resolved inside procedures/middleware
      headers: req.headers,
    };
  } catch (error) {
    console.error("[tRPC Context] Error fetching session:", error);
    return {
      session: null,
      user: null,
      workspaceContext: null,
      orgContext: null,
      headers: req?.headers ?? new Headers(),
    };
  }
}

export interface Context extends AuthContext {
  workspaceContext: (WorkspaceContext & { permissions: string[] }) | null;
  orgContext: {
    organization: Organization;
  } | null;
  headers: Headers;
}

export type ContextType = Awaited<ReturnType<typeof createContext>>;
