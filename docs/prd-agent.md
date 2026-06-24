# ShipFlow AI — PRD Intelligence Engine

## Overview

The **PRD Intelligence Engine** is Milestone 1.0 of the ShipFlow AI pipeline. It activates immediately after the Discovery Agent approves a feature (status: `READY_FOR_PRD`) and produces a comprehensive, structured Product Requirements Document (PRD) ready for engineering, design, and product review.

---

## Architecture

The PRD Engine follows the same layered architecture established by the Discovery Agent. No new infrastructure is introduced.

```
Approved Feature (READY_FOR_PRD)
        │
        ▼
  PRDAgent.generatePRD()
        │
        ├─► Load Feature + Spec JSON  (Prisma)
        ├─► Load Conversation Memory  (ConversationMemory)
        ├─► Load Prompt Template      (PromptLoader: "prd:generate")
        │
        ▼
  AgentRunner.run()
        │
        ├─► AI Provider → generateObject(prompt, prdDocumentSchema)
        ├─► Output Validator (Zod parse)
        ├─► Retry Engine (max 3 retries)
        │
        ├─► Persist: AgentRun, AgentLog, ContextSnapshot, TokenUsage
        │
        ▼
  Markdown Renderer (pure function — separate step)
        │
        ▼
  PRD upserted in DB (version auto-incremented)
        │
        ▼
  Feature status → PRD_GENERATED
```

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/ai/src/agents/prd-agent.ts` | PRDAgent orchestrator |
| `packages/ai/src/schemas/prd.ts` | Zod output schemas |
| `packages/ai/src/contracts/prd.ts` | TypeScript input/output contracts |
| `packages/ai/src/prompts/prd/v1.ts` | AI prompt template |
| `packages/api/src/routers/prd.ts` | tRPC router (5 endpoints) |
| `packages/validators/src/prd.ts` | Input validation schemas |
| `packages/types/src/prd.ts` | Shared type definitions |
| `apps/web/src/app/internal/prd-test/page.tsx` | Developer playground |
| `docs/prd-agent.md` | This document |

---

## PRD Endpoints

All endpoints are scoped to `workspaceProcedure` (authenticated + workspace membership enforced).

### `prd.createPRD` — Mutation

Generates a new PRD for an approved feature.

**Input:**
```ts
{
  featureId: string; // UUID
  workspaceId: string; // UUID
}
```

**Feature Status Requirement:** `READY_FOR_PRD`

**Output:**
```ts
{
  prdId: string;
  version: number;
  featureId: string;
  agentRunId: string;
  markdownContent: string;
  document: PRDDocument;
}
```

---

### `prd.regeneratePRD` — Mutation

Re-generates a PRD, creating a new version. Increments the version counter.

**Feature Status Requirement:** `READY_FOR_PRD` or `PRD_GENERATED`

**Output:** Same as `createPRD`

---

### `prd.getPRD` — Query

Fetches the current PRD for a feature. Returns both the structured JSON document and the rendered Markdown.

**Input:**
```ts
{
  featureId: string;
  workspaceId: string;
}
```

**Output:**
```ts
{
  id: string;
  featureId: string;
  version: number;
  document: PRDDocument | null;
  markdownContent: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### `prd.listVersions` — Query

Returns version history metadata from `AgentRun` records (one entry per successful PRD generation).

**Output:**
```ts
{
  versions: Array<{
    versionNumber: number;
    agentRunId: string;
    createdAt: Date;
    isCurrent: boolean;
  }>;
  currentVersion: number;
  prdId: string;
  featureId: string;
  lastUpdated: Date;
}
```

---

### `prd.compareVersions` — Query

Returns a structured JSON diff of two PRD versions. Since only the current PRD document is stored in the `PRD` table, deep historical diffs reference AgentRun snapshots via `agentRunId`.

**Input:**
```ts
{
  featureId: string;
  workspaceId: string;
  versionA: number;
  versionB: number;
}
```

**Output:**
```ts
{
  featureId: string;
  versionA: number;
  versionB: number;
  diff: Array<{
    field: string;
    versionA: unknown;
    versionB: unknown;
    changeType: "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";
  }>;
  summary: string;
}
```

---

## PRD Document Structure

The `PRDDocument` is the AI-generated structured JSON output containing 16 sections:

| Section | Description |
|---------|-------------|
| `executiveSummary` | 2–4 sentence strategic overview |
| `problemStatement` | Clear problem definition |
| `goals` | 3–7 measurable goals |
| `nonGoals` | Explicit out-of-scope items |
| `userPersonas` | Personas with pain points |
| `userStories` | As-a/I-want/So-that stories with MoSCoW priorities |
| `functionalRequirements` | FR-001… with priorities |
| `nonFunctionalRequirements` | Performance, security, reliability NFRs |
| `acceptanceCriteria` | BDD Given/When/Then scenarios |
| `edgeCases` | Edge cases the implementation must handle |
| `risks` | Risks with likelihood/impact/mitigation |
| `dependencies` | External/internal dependencies |
| `successMetrics` | Measurable KPIs with baseline/target |
| `outOfScope` | Items explicitly excluded |
| `futureEnhancements` | Follow-up feature ideas |

---

## Versioning

- **First generation:** version = 1
- **Each regeneration:** version incremented via `{ increment: 1 }` Prisma update
- Only the **current version's JSON+Markdown** is stored in the `PRD` table
- Historical metadata is accessible via `AgentRun` records (one per successful generation)

---

## AI Provider Integration

The PRD Agent uses the existing `AgentRunner.run()` infrastructure which:
- Supports any provider registered in `getProvider()` (Gemini, OpenAI, etc.)
- Persists `AgentRun`, `AgentLog`, `ContextSnapshot`, and `TokenUsage` automatically
- Handles retry with exponential backoff (max 3 attempts)
- Validates output with Zod before returning

---

## Developer Playground

Navigate to `/internal/prd-test` for the full developer playground which supports:
- Selecting PRD-eligible features (status: `READY_FOR_PRD`, `PRD_GENERATED`, `PRD_APPROVED`)
- Generating or regenerating a PRD
- Viewing the rendered Markdown
- Viewing the raw JSON document
- Browsing version history
- Comparing two versions with a structured diff
- Downloading the PRD as a `.md` file

---

## Pipeline Flow (End to End)

```
User submits feature request
    → Discovery Agent (Milestones 0.1–0.9)
        → Feature status: READY_FOR_PRD
            → PRD Agent (Milestone 1.0)
                → Feature status: PRD_GENERATED
                    → [Future] Task Generator (Milestone 2.0)
```

---

## Error Handling

All errors from the PRDAgent are surfaced as standard `TRPCError` instances. The following error codes are used:

| Code | Trigger |
|------|---------|
| `NOT_FOUND` | Feature or PRD does not exist |
| `INTERNAL_SERVER_ERROR` | AI provider failure, DB write failure |

Status validation failures (wrong `FeatureStatus`) are thrown as plain `Error` instances inside the agent and caught/wrapped by the router.
