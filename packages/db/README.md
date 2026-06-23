# @shipflow/db

The ShipFlow AI database package. Contains the Prisma schema, migrations, and seed infrastructure for PostgreSQL 16+.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Docker Setup](#docker-setup)
4. [Environment Variables](#environment-variables)
5. [Prisma Commands](#prisma-commands)
6. [Migration Workflow](#migration-workflow)
7. [Seed Workflow](#seed-workflow)
8. [Schema Overview](#schema-overview)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Minimum Version | Install |
|:---|:---|:---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker Desktop | 24+ | [docker.com](https://docker.com) |
| Docker Compose | v2 | bundled with Docker Desktop |

---

## Quick Start

```bash
# 1. Copy the local environment file
cp .env.local.example .env.local

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Wait for health check to pass (≈10s)
docker compose ps

# 4. Install dependencies (from repo root)
pnpm install

# 5. Generate the Prisma Client
pnpm --filter @shipflow/db db:generate

# 6. Run first migration
pnpm --filter @shipflow/db db:migrate --name init

# 7. (Optional) Open Prisma Studio
pnpm --filter @shipflow/db db:studio
```

---

## Docker Setup

The repository includes a production-quality `docker-compose.yml` at the project root.

### Start PostgreSQL only

```bash
docker compose up -d postgres
```

### Start PostgreSQL + pgAdmin (browser UI)

```bash
docker compose --profile tools up -d
```

pgAdmin is then available at **http://localhost:5050**
- Email: `admin@shipflow.ai`
- Password: `shipflow_admin`

### Stop all services

```bash
docker compose down
```

### Stop and remove all data (destructive)

```bash
docker compose down -v
```

### Check service health

```bash
docker compose ps
docker compose logs postgres --tail=20
```

---

## Environment Variables

Copy the example file before starting:

```bash
# Root-level example — all integrations
cp .env.example .env.local

# Local development pre-filled with Docker defaults
cp .env.local.example .env.local
```

### Required Database Variables

| Variable | Description | Docker Default |
|:---|:---|:---|
| `DATABASE_URL` | Prisma connection URL (pooled) | `postgresql://shipflow:shipflow_secret@localhost:5432/shipflow_db` |
| `DIRECT_URL` | Unpooled URL for migrations | Same as `DATABASE_URL` locally |

> **Neon / Supabase note:** When using a connection pooler (PgBouncer), set `DATABASE_URL` to the pooled URL and `DIRECT_URL` to the direct connection URL. Migrations must use the direct URL.

---

## Prisma Commands

All commands are scoped to this package via `--filter @shipflow/db`.

| Command | Description |
|:---|:---|
| `pnpm --filter @shipflow/db db:generate` | Generate Prisma Client from schema |
| `pnpm --filter @shipflow/db db:validate` | Validate schema syntax |
| `pnpm --filter @shipflow/db db:format` | Auto-format schema file |
| `pnpm --filter @shipflow/db db:push` | Push schema to DB (no migration file) |
| `pnpm --filter @shipflow/db db:migrate` | Create and run a new migration |
| `pnpm --filter @shipflow/db db:migrate:deploy` | Deploy pending migrations (CI/CD) |
| `pnpm --filter @shipflow/db db:reset` | Reset DB and re-run all migrations |
| `pnpm --filter @shipflow/db db:seed` | Run seed script |
| `pnpm --filter @shipflow/db db:studio` | Open Prisma Studio at localhost:5555 |

---

## Migration Workflow

### Development — create a new migration

```bash
# After editing schema.prisma, run:
pnpm --filter @shipflow/db db:migrate --name descriptive_migration_name

# Example:
pnpm --filter @shipflow/db db:migrate --name add_user_avatar_field
```

This will:
1. Generate a SQL migration file in `prisma/migrations/`
2. Apply it to your local database
3. Re-generate the Prisma Client automatically

### First migration (initial setup)

```bash
pnpm --filter @shipflow/db db:migrate --name init
```

### Production / CI deployment

```bash
# Deploy all pending migrations (no prompt, no schema reset)
pnpm --filter @shipflow/db db:migrate:deploy
```

### Reset development database

```bash
# WARNING: Drops all data and re-runs all migrations from scratch
pnpm --filter @shipflow/db db:reset
```

---

## Seed Workflow

```bash
# Run seed (development only)
pnpm --filter @shipflow/db db:seed
```

The seed entry point is at `prisma/seed.ts`.

Domain-specific seeders live in `prisma/seeders/` (to be created per milestone):

```
prisma/
  seed.ts               # Entry point (Phase-ordered orchestrator)
  seeders/
    01-users.ts         # Identity seed
    02-organizations.ts # Tenancy seed
    03-workspaces.ts    # Workspace seed
    04-projects.ts      # Project seed
    05-features.ts      # Feature lifecycle seed
```

---

## Schema Overview

The schema implements 35 models across 8 domains:

```
Identity    → User, Session, Account, Verification, ApiKey
Tenancy     → Organization, Workspace, Member, WorkspaceInvitation
Git         → GitHubInstallation, Repository, Branch, Commit
Projects    → Project, Feature, ClarificationQuestion, ClarificationAnswer
Product     → PRD, Task, TaskDependency
Review      → PullRequest, Review, ReviewComment
Release     → Release, Deployment
AI          → AgentRun, AgentLog, ContextSnapshot, MemoryReference,
              TokenUsage, AgentRetry, PromptVersion
Billing     → Subscription, Payment, Invoice, Credit, CreditUsage, MonthlyUsage
Notify      → Notification, NotificationPreference
Audit       → WebhookEvent, AuditLog
```

See [`prisma/schema.prisma`](./prisma/schema.prisma) for the full implementation.

---

## Troubleshooting

### `Error: DATABASE_URL environment variable not found`

```bash
# Make sure .env.local exists with DATABASE_URL set
cp .env.local.example .env.local
```

### `Error: P1001: Can't reach database server`

```bash
# Check if Docker is running
docker ps

# Check if the postgres container is healthy
docker compose ps

# Start it if it isn't running
docker compose up -d postgres

# Check logs for startup errors
docker compose logs postgres
```

### `Error: P3005: The database schema is not empty`

This happens when running `db push` on an existing database. Use migrations instead:

```bash
pnpm --filter @shipflow/db db:migrate --name init
```

### Migration drift — schema out of sync

```bash
# Check migration status
npx prisma migrate status --schema=packages/db/prisma/schema.prisma

# Reset and re-apply (development only — DESTRUCTIVE)
pnpm --filter @shipflow/db db:reset
```

### Prisma Client out of date

After any schema change, always regenerate the client:

```bash
pnpm --filter @shipflow/db db:generate
```

### Port 5432 already in use

Another PostgreSQL instance is running locally. Either stop it or change the Docker port mapping in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"   # Use 5433 externally
```

Then update `DATABASE_URL` to use port `5433`.

---

## Development Workflow

```
schema change → db:format → db:validate → db:migrate → db:generate → continue
```

1. Edit `prisma/schema.prisma`
2. `pnpm --filter @shipflow/db db:format` — format the file
3. `pnpm --filter @shipflow/db db:validate` — verify syntax
4. `pnpm --filter @shipflow/db db:migrate --name <name>` — create + apply migration
5. Client is auto-regenerated after migration
6. Commit `prisma/schema.prisma` + `prisma/migrations/` together

---

*Part of the ShipFlow AI monorepo — `packages/db`*
