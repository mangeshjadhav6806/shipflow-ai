import { betterAuth } from "better-auth";
import type { DBAdapter } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "@shipflow/db";


// =============================================================================
// ShipFlow AI — BetterAuth Server Instance
// =============================================================================
// This is the SINGLE auth instance used on the server side.
// It must NOT be imported in client components.
// Use @shipflow/auth/client for React components.
// =============================================================================

const isDevelopment = process.env.NODE_ENV === "development";
const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Validate required environment variables
if (!process.env.BETTER_AUTH_SECRET) {
  if (isDevelopment) {
    console.warn("[BetterAuth] BETTER_AUTH_SECRET not set. Using development fallback.");
  } else {
    throw new Error(
      "BETTER_AUTH_SECRET environment variable is required in production. Generate with: openssl rand -base64 32"
    );
  }
}

// Prisma Client Extension to dynamically strip out the 'emailVerified' field from any User operations,
// since the existing Prisma schema does not define emailVerified. Also handles credentials
// 'password' storage by mapping it to the unused 'accessToken' column on the Account table.
const prismaWithAuth = prisma.$extends({
  query: {
    user: {
      async create({ args, query }) {
        if (args.data) {
          const { emailVerified, ...rest } = args.data as any;
          args.data = rest;
        }
        return query(args);
      },
      async update({ args, query }) {
        if (args.data) {
          const { emailVerified, ...rest } = args.data as any;
          args.data = rest;
        }
        return query(args);
      },
      async updateMany({ args, query }) {
        if (args.data) {
          const { emailVerified, ...rest } = args.data as any;
          args.data = rest;
        }
        return query(args);
      },
      async upsert({ args, query }) {
        if (args.create) {
          const { emailVerified, ...rest } = args.create as any;
          args.create = rest;
        }
        if (args.update) {
          const { emailVerified, ...rest } = args.update as any;
          args.update = rest;
        }
        return query(args);
      },
    },
    account: {
      async create({ args, query }) {
        if (args.data) {
          const { password, ...rest } = args.data as any;
          if (password !== undefined) {
            rest.accessToken = password;
          }
          args.data = rest;
        }
        return query(args);
      },
      async update({ args, query }) {
        if (args.data) {
          const { password, ...rest } = args.data as any;
          if (password !== undefined) {
            rest.accessToken = password;
          }
          args.data = rest;
        }
        return query(args);
      },
      async updateMany({ args, query }) {
        if (args.data) {
          const { password, ...rest } = args.data as any;
          if (password !== undefined) {
            rest.accessToken = password;
          }
          args.data = rest;
        }
        return query(args);
      },
      async upsert({ args, query }) {
        if (args.create) {
          const { password, ...rest } = args.create as any;
          if (password !== undefined) {
            rest.accessToken = password;
          }
          args.create = rest;
        }
        if (args.update) {
          const { password, ...rest } = args.update as any;
          if (password !== undefined) {
            rest.accessToken = password;
          }
          args.update = rest;
        }
        return query(args);
      },
      async findFirst({ args, query }) {
        const result = await query(args);
        if (result && (result as any).accessToken) {
          (result as any).password = (result as any).accessToken;
        }
        return result;
      },
      async findUnique({ args, query }) {
        const result = await query(args);
        if (result && (result as any).accessToken) {
          (result as any).password = (result as any).accessToken;
        }
        return result;
      },
      async findMany({ args, query }) {
        const results = await query(args);
        if (Array.isArray(results)) {
          for (const result of results) {
            if (result && (result as any).accessToken) {
              (result as any).password = (result as any).accessToken;
            }
          }
        }
        return results;
      },
    },
  },
});

export const auth = betterAuth({
  // ─── Database ──────────────────────────────────────────────────────────────
  database: prismaAdapter(prismaWithAuth as any, {
    provider: "postgresql",
  }),

  // ─── User Field Mapping ───────────────────────────────────────────────────
  user: {
    fields: {
      image: "avatarUrl",
    },
  },

  // ─── Account Field Mapping ────────────────────────────────────────────────
  account: {
    fields: {
      providerId: "provider",
      accountId: "providerId",
    },
  },

  // ─── Application URL ───────────────────────────────────────────────────────
  baseURL: appUrl,

  // ─── Secret Key ────────────────────────────────────────────────────────────
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key-min-32-chars-1234567890",

  // ─── Session Configuration ─────────────────────────────────────────────────
  session: {
    // Sessions expire after 30 days of inactivity
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    // Refresh session expiry on every request if within 1 day of expiry
    updateAge: 60 * 60 * 24, // 1 day
    // Cookie configuration for secure session storage
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute client-side cache
    },
  },

  // ─── Email / Password Auth ─────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !isDevelopment,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // ─── Social OAuth Providers ────────────────────────────────────────────────
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // Request email scope for GitHub OAuth
      scope: ["user:email", "read:user"],
    },
    // Google OAuth provider (optional, configuration-only)
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  // ─── Trusted Origins (CORS) ────────────────────────────────────────────────
  // In development, allow localhost. In production, only the app URL.
  trustedOrigins: isDevelopment
    ? [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
      ]
    : [appUrl],

  // ─── Advanced Security ─────────────────────────────────────────────────────
  advanced: {
    database: {
      generateId: "uuid",
    },
    // Use __Secure- prefix in production for HTTPS-only cookies
    useSecureCookies: !isDevelopment,
    // Generate unique cookie names to prevent conflicts
    cookiePrefix: "shipflow",
    // Cross-subdomain auth support (useful for multi-workspace)
    crossSubDomainCookies: {
      enabled: false, // Enable when deploying on *.shipflow.ai subdomains
    },
    defaultCookieAttributes: {
      // SameSite=Lax: safe for top-level navigations, blocks CSRF
      sameSite: "lax",
      httpOnly: true,
      secure: !isDevelopment,
      path: "/",
    },
  },
});

// ─── Type Exports ─────────────────────────────────────────────────────────────
// Infer session and user types directly from the auth instance
export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
