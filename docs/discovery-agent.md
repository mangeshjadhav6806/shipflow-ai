# ShipFlow AI — Discovery Agent Documentation

## Overview

The **Discovery Agent** implements the AI-powered Product Discovery pipeline. This is the first step of the ShipFlow workflow, converting raw feature requests (e.g. email, ticket, chat, plain text) into a validated, structured feature specification.

```
Customer Request
       │
       ▼
Feature Analysis (isAmbiguous? isFeasible?)
       │
       ├─► [needsClarification: true] ──► Clarification Questions (Feature.status = CLARIFYING)
       │
       └─► [needsClarification: false] ─► Duplicate Detection
                                                │
                                                ▼
                                          Decision Maker (Confidence Engine)
                                                │
                                                ▼
                                          Spec Generation (Feature.status = READY_FOR_PRD)
```

---

## Reusable AI Platform Architecture

To support future agents (PRD, Planning, Review, Release) seamlessly, the discovery pipeline is built on a reusable AI infrastructure located under `packages/ai`:

1. **AI Provider Layer (`packages/ai/src/providers`)**
   - Abstraction interface `AIProvider`.
   - Concrete implementations:
     - `GoogleAIProvider`: Gemini 1.5 Flash via `@ai-sdk/google`.
     - `OpenAIProvider`: GPT-4o-mini via `@ai-sdk/openai`.
     - `MockAIProvider`: Deterministic mock responses matching validation schemas.
   - Provider factory `getProvider(preferred?)` resolves provider by key existence.

2. **Agent Runner (`packages/ai/src/core/agent-runner.ts`)**
   - Controls agent run lifecycle: loads template → substitute values → run AI → Zod validate → persist database.
   - Persists database structures: `AgentRun`, `AgentLog`, `TokenUsage`, `ContextSnapshot`, `MemoryReference`, `AgentRetry`.

3. **Output Schema Validation (`packages/ai/src/core/output-validator.ts`)**
   - Wraps Zod schema parsing and throws structured `ValidationError` containing formatted field-level errors.

4. **Exponential Backoff Retry (`packages/ai/src/core/retry.ts`)**
   - Retries failing calls up to 3 times (1s, 2s, 4s delay).
   - Reports retry attempts in `AgentRetry` table.

5. **Observability (`packages/ai/src/utils/observability.ts`)**
   - Computes aggregated metrics (`latencyMs`, `retryCount`, `tokenUsage`, `estimatedCostUsd`) for any agent execution run.

---

## Database Integration

The agent run lifecycle persists the following database records on every execution turn:

| Entity | Purpose |
|---|---|
| `AgentRun` | Captures overall execution status (`SUCCESS`, `FAILED`), agent type, and total duration. |
| `AgentLog` | Stores detailed logging messages printed during execution. |
| `ContextSnapshot` | Captures the final hydrated prompt string, variables, and templates used for audit-grade reproducibility. |
| `TokenUsage` | Tracks input and output token consumption and estimated costs in USD. |
| `ClarificationQuestion` | Stores AI-generated questions to resolve ambiguity. |
| `ClarificationAnswer` | Stores answers supplied by users. |
| `PRD` | Stores the final compiled feature specification inside the `content` field as JSON. |

---

## Architecture Contracts (Interfaces Only)

These interface definitions reside under `packages/ai/src/contracts` to support long-term plugin integrations:

- **AI Event System (`events.ts`)**: Event structures for logging progress (`AgentStarted`, `PromptLoaded`, `ProviderCalled`, etc.).
- **Workflow Engine (`workflow.ts`)**: A reusable orchestrator contract for sequential step execution.
- **Context Providers (`context.ts`)**: Data gathering contracts (`Workspace`, `Conversation`, `Feature`, `Repository`).
- **Repository Search (`search.ts`)**: Text/embedding search capability contract.
- **Plugin Architecture (`plugins.ts`)**: Modular capabilities wrapper.

---

## Validation & Testing

To test the Discovery Agent pipeline, visit the dedicated internal developer playground:
- Route: `/internal/discovery-test`
- Authenticate or use the session details from `/internal/workspace-test`.
- Create a project, select it, enter a feature request, and trigger the pipeline.
- If testing in Mock mode, include the word `vague` or `ambiguous` to trigger the clarification loop, or `duplicate` to trigger the duplicate detection flow.
