// =============================================================================
// ShipFlow AI — AI Workflow Engine Contracts
// =============================================================================
// Interface-only definitions for the reusable workflow engine abstraction.
// A workflow engine orchestrates multiple sequential steps of an agent pipeline.
// =============================================================================

export interface WorkflowContext {
  workspaceId: string;
  featureId: string;
  agentRunId?: string;
  conversationId?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowStep<TInput, TOutput> {
  name: string;
  execute(input: TInput, ctx: WorkflowContext): Promise<TOutput>;
  shouldSkip?(input: TInput, ctx: WorkflowContext): boolean;
}

export interface WorkflowEngine<TInput, TOutput> {
  steps: WorkflowStep<any, any>[];
  run(input: TInput, ctx: WorkflowContext): Promise<TOutput>;
}
