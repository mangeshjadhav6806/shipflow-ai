# ShipFlow AI — Enterprise Autonomous Software Engineering Platform

ShipFlow AI is an autonomous, AI-driven Product-to-Release pipeline coordinator built for modern engineering teams. It automates requirement clarifications, PRD creations, task decompositions, code writing, pull request reviews, QA test executions, and production releases.

---

## 1. Directory Structure

```
shipflow-ai/
├── apps/
│   └── web/                   # Next.js 15 App Router web portal
├── packages/
│   ├── api/                   # tRPC Router definitions, controllers & procedures
│   ├── db/                    # PostgreSQL Prisma schema and database client exports
│   ├── ui/                    # Shared design system components utilizing Tailwind and Shadcn UI
│   ├── config/                # Central TypeScript and ESLint configurations
│   ├── github/                # Octokit client integration and webhook verification rules
│   ├── ai/                    # Vercel AI SDK prompty wrappers and model routing
│   └── billing/               # Razorpay billing checkout sessions helper
├── package.json               # Monorepo configuration
├── pnpm-workspace.yaml        # Workspace workspace mappings
└── turbo.json                 # Turborepo task pipeline configs
```

---

## 2. Core Architecture

```
[Feature Request] ──> (Clarification Loop) ──> [PRD] ──> [Task Breakdown] 
                                                                 │
[Release] <── (QA & Deploy) <── [AI PR Review] <── (Code Gen) <──┘
```

1. **AI Supervisor & Orchestration:** A central supervisor runs event queues to coordinate child worker agents (*Clarification, PRD Generator, Task Generator, Repository Analysis, Code Generator, PR Reviewer, QA Validator, Release Readiness, Notification*).
2. **AI Tool Registry:** A central security gateway intercepts agent function calls, authorizing access to repositories, files, and sandboxed terminal environments.
3. **Repository RAG:** Code indexing parses AST models using Tree-Sitter, mapping text embeddings to PgVector for semantic code checks.
4. **Intelligent Model Router:** Directs queries to Claude (reviews/logic), GPT (edits), or Gemini (indexing) with retry fallbacks.
5. **Event-Driven Queues:** Manages asynchronous workers via Inngest queues, handling rate-limiting parameters.
6. **Billing & Credit Engine:** Tracks subscription scopes and computes credits limits using Razorpay checkouts.

---

## 3. Getting Started

### Prerequisites
* **Node.js:** `v20.x` or higher
* **Package Manager:** `pnpm` `v8.x` or `v9.x`
* **Docker:** Required for running local database sandboxes (PostgreSQL, Redis)

### Installation
Clone the repository and install workspace dependencies:
```bash
pnpm install
```

### Database Seeding
Ensure your local PostgreSQL service is running and configure the `.env` variables, then push migrations:
```bash
pnpm db:push
```

### Development Server
Run the local Turborepo developer pipeline:
```bash
pnpm dev
```

---

## 4. Development Commands

The root package delegates pipeline commands to Turborepo:

* `pnpm dev` — Launches all workspaces in development mode (caching disabled).
* `pnpm build` — Compiles and builds all workspace packages with cache checks.
* `pnpm lint` — Runs ESLint checkers across all codebase files.
* `pnpm typecheck` — Executes strict TypeScript check-offs (`tsc --noEmit`).
* `pnpm test` — Executes Vitest unit and integration test blocks.
* `pnpm db:generate` — Generates client files from the database schema.
* `pnpm db:push` — Pushes database models to your active PostgreSQL schema.
