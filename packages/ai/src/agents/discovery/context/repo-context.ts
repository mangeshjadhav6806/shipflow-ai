// =============================================================================
// ShipFlow AI — Repository Context Provider Stub
// =============================================================================

import { RepositoryContextProvider, RepositoryContext } from "../../../contracts/context";

export class RepoContextStub implements RepositoryContextProvider {
  name = "RepoContextStub";

  async gather(workspaceId: string, featureId: string): Promise<RepositoryContext> {
    // Return stub repository context.
    // In future milestones, this will connect to the GitHub App installation and pull actual file references.
    return {
      relevantFiles: [
        {
          filePath: "src/components/button.tsx",
          content: "// Button component with custom design",
          matchScore: 0.5,
        },
        {
          filePath: "src/utils/auth.ts",
          content: "// Helper functions for authorization checks",
          matchScore: 0.5,
        }
      ],
      branchName: `feature/sf-${featureId.substring(0, 8)}`,
      defaultBranchName: "main",
    };
  }
}
