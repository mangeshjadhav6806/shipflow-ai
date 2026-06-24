// =============================================================================
// ShipFlow AI — AI Repository Search Contracts
// =============================================================================
// Interface-only definitions for repo-aware search plugins.
// =============================================================================

export interface SearchFilter {
  extensions?: string[];
  excludePaths?: string[];
  limit?: number;
}

export interface SearchResult {
  filePath: string;
  content: string;
  relevanceScore: number;
}

export interface RepositorySearch {
  searchByText(query: string, workspaceId: string, opts?: SearchFilter): Promise<SearchResult[]>;
  searchByEmbedding?(vector: number[], workspaceId: string): Promise<SearchResult[]>;
}
