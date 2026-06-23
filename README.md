# ShipFlow AI

ShipFlow AI is a full-stack monorepo for building AI-powered shipping and logistics workflows. It uses npm workspaces, TypeScript, tRPC, Next.js 14, and Prisma.

## Structure

```
apps/
  web/          Next.js 14 frontend
packages/
  api/          tRPC server and routers
  db/           Prisma schema and client
  ui/           Shared shadcn/ui components
  config/       Shared TypeScript and ESLint config
  github/       GitHub Octokit wrapper
  ai/           AI agent utilities
  billing/      Razorpay billing client
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run dev` — Start the Next.js development server
- `npm run build` — Build all packages and apps
- `npm run lint` — Lint all packages and apps
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Push schema to database
