// =============================================================================
// ShipFlow AI — AI Event System Contracts
// =============================================================================
// Interface-only definitions for the AI agent event system.
// An event bus implementation is NOT part of this milestone.
// These contracts document the event lifecycle so future milestones can
// build an observable, event-driven agent pipeline.
// =============================================================================

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

export type AIEventType =
  | "AgentStarted"
  | "PromptLoaded"
  | "ProviderCalled"
  | "OutputValidated"
  | "Persisted"
  | "Completed"
  | "Failed";

// ---------------------------------------------------------------------------
// Base Event Shape
// ---------------------------------------------------------------------------

export interface AIEvent {
  /** Unique event ID */
  id: string;
  /** Event category */
  type: AIEventType;
  /** AgentRun ID this event belongs to */
  agentRunId: string;
  /** Feature this agent is processing */
  featureId: string;
  /** Workspace context */
  workspaceId: string;
  /** When the event occurred */
  timestamp: Date;
  /** Optional structured context */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Specific Event Shapes
// ---------------------------------------------------------------------------

/** Emitted when an AgentRun record is created and execution begins. */
export interface AgentStartedEvent extends AIEvent {
  type: "AgentStarted";
  agentType: string;
  providerName: string;
}

/** Emitted once the prompt template has been resolved (DB or static fallback). */
export interface PromptLoadedEvent extends AIEvent {
  type: "PromptLoaded";
  promptKey: string;
  source: "database" | "static";
  version: number;
}

/** Emitted immediately before the AI provider API call. */
export interface ProviderCalledEvent extends AIEvent {
  type: "ProviderCalled";
  provider: string;
  model: string;
  estimatedInputTokens?: number;
}

/** Emitted after Zod schema validation of the AI response. */
export interface OutputValidatedEvent extends AIEvent {
  type: "OutputValidated";
  schemaName: string;
  success: boolean;
  validationErrors?: string[];
  attemptNumber: number;
}

/** Emitted after all DB persistence operations complete. */
export interface PersistedEvent extends AIEvent {
  type: "Persisted";
  recordsWritten: string[]; // e.g. ["AgentRun", "AgentLog", "TokenUsage"]
}

/** Emitted when an agent run completes successfully. */
export interface CompletedEvent extends AIEvent {
  type: "Completed";
  durationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  retryCount: number;
}

/** Emitted when an agent run fails (after all retries exhausted). */
export interface FailedEvent extends AIEvent {
  type: "Failed";
  errorCode: string;
  errorMessage: string;
  attemptCount: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Event Emitter Interface (NOT implemented in this milestone)
// ---------------------------------------------------------------------------

/**
 * Contract for a future event bus implementation.
 *
 * Future milestones may implement this using:
 * - Inngest events (for async cross-service coordination)
 * - Redis pub/sub (for real-time dashboard streaming)
 * - Server-Sent Events (for live agent log streaming to UI)
 */
export interface AIEventEmitter {
  /** Emit an event to all registered handlers. */
  emit(event: AIEvent): void;

  /** Register a handler for a specific event type. */
  on<T extends AIEvent>(type: AIEventType, handler: (event: T) => void | Promise<void>): void;

  /** Remove a handler. */
  off(type: AIEventType, handler: Function): void;

  /** Emit without blocking (fire-and-forget). */
  emitAsync(event: AIEvent): Promise<void>;
}
