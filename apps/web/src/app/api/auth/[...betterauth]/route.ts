import { authHandler } from "@shipflow/auth/server";

// =============================================================================
// ShipFlow AI — BetterAuth Next.js App Router Handler
// =============================================================================
// This route handles all BetterAuth authentication endpoints (e.g. login, sign up,
// sign out, session retrieval, social login redirects, etc.) dynamically.
// =============================================================================

export const { GET, POST } = authHandler;
