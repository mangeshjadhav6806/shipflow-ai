// =============================================================================
// ShipFlow AI — AI Context Providers Contracts
// =============================================================================
// Interface-only definitions for gathering context for AI models.
// =============================================================================

export interface ContextProvider<T> {
  name: string;
  gather(workspaceId: string, featureId: string): Promise<T>;
}

// Workspace Context Contract
export interface WorkspaceContext {
  id: string;
  name: string;
  organizationId: string;
  metadata?: Record<string, unknown>;
}

// Conversation Memory Context Contract
export interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: Date;
}

export interface ConversationHistory {
  conversationId: string;
  messages: ConversationMessage[];
}

// Feature Context Contract
export interface FeatureHistory {
  featureId: string;
  title: string;
  description: string;
  status: string;
  createdAt: Date;
}

// Repository Code Context Contract
export interface RepositoryContext {
  relevantFiles: {
    filePath: string;
    content: string;
    matchScore: number;
  }[];
  branchName: string;
  defaultBranchName: string;
}

export interface WorkspaceContextProvider extends ContextProvider<WorkspaceContext> {}
export interface ConversationContextProvider extends ContextProvider<ConversationHistory> {}
export interface FeatureContextProvider extends ContextProvider<FeatureHistory> {}
export interface RepositoryContextProvider extends ContextProvider<RepositoryContext> {}
