// =============================================================================
// ShipFlow AI — Repository Agent
// =============================================================================
// Orchestrates repository indexing, deterministic and AI-based analysis,
// and semantic file ranking. Reuses AgentRunner, PromptLoader, etc.
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import { prisma } from "@shipflow/db";
import { AgentType, AgentStatus } from "@prisma/client";
import { logger } from "@shipflow/logger";
import { AgentRunner } from "../core/agent-runner";
import { ConversationMemory } from "../memory/conversation-memory";
import { repositoryAnalysisSchema, relevantFilesRankingSchema } from "../schemas/repository";
import type {
  RepositoryAnalysisResult,
  RepositoryAnalysisContext,
  RepositorySearchContext,
} from "../contracts/repository";
import type {
  RepositoryMemory,
  RepositorySearchResponse,
  RankedArea,
} from "@shipflow/types";

export class RepositoryAgent {
  /**
   * Scans and returns all file paths in the repository.
   * Attempting GitHub Trees API first, falling back to local workspace.
   * Avoids downloading file contents except package.json for metadata inspection.
   */
  static async fetchRepositoryFiles(
    owner: string,
    name: string,
    defaultBranch: string
  ): Promise<{ filesList: string[]; packageJson: any | null }> {
    logger.info(`[RepositoryAgent] Indexing files tree for: ${owner}/${name} on ${defaultBranch}`);
    
    let filesList: string[] = [];
    let packageJsonContent: string | null = null;

    try {
      // 1. Try public GitHub REST API for git trees
      const url = `https://api.github.com/repos/${owner}/${name}/git/trees/${defaultBranch}?recursive=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ShipFlow-AI-Agent",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.tree)) {
          filesList = data.tree
            .filter((node: any) => node.type === "blob")
            .map((node: any) => node.path);

          logger.info(`[RepositoryAgent] Successfully fetched ${filesList.length} files from GitHub API.`);
          
          // Try to fetch package.json from raw contents
          const pkgUrl = `https://raw.githubusercontent.com/${owner}/${name}/${defaultBranch}/package.json`;
          const pkgRes = await fetch(pkgUrl, {
            headers: { "User-Agent": "ShipFlow-AI-Agent" },
          });
          if (pkgRes.ok) {
            packageJsonContent = await pkgRes.text();
          }
        }
      } else {
        logger.warn(
          `[RepositoryAgent] GitHub API returned status ${response.status}. Falling back to local filesystem.`
        );
      }
    } catch (err) {
      logger.warn(`[RepositoryAgent] GitHub Trees API failed. Falling back to local filesystem.`, err);
    }

    // 2. Local fallback if GitHub API call failed or returned empty list
    if (filesList.length === 0) {
      try {
        const root = this.findWorkspaceRoot();
        filesList = this.getFilesRecursively(root);
        logger.info(`[RepositoryAgent] Local fallback scanned ${filesList.length} files from workspace root: ${root}`);

        const pkgPath = path.join(root, "package.json");
        if (fs.existsSync(pkgPath)) {
          packageJsonContent = fs.readFileSync(pkgPath, "utf-8");
        }
      } catch (err) {
        logger.error(`[RepositoryAgent] Local filesystem scan failed:`, err);
      }
    }

    let packageJson = null;
    if (packageJsonContent) {
      try {
        packageJson = JSON.parse(packageJsonContent);
      } catch (err) {
        logger.warn(`[RepositoryAgent] Failed to parse package.json content:`, err);
      }
    }

    return { filesList, packageJson };
  }

  /**
   * Helper to perform static deterministic inspection of codebase layout.
   */
  static runDeterministicInspection(
    filesList: string[],
    packageJson: any | null
  ) {
    const deps = {
      ...(packageJson?.dependencies || {}),
      ...(packageJson?.devDependencies || {}),
    };

    // Framework detection
    let framework = "Vanilla JS/TS";
    if (deps["next"]) framework = "Next.js";
    else if (deps["react-native"]) framework = "React Native";
    else if (deps["@remix-run/react"]) framework = "Remix";
    else if (deps["nuxt"]) framework = "Nuxt";
    else if (deps["vue"]) framework = "Vue / Vite";
    else if (deps["vite"] || deps["@vitejs/plugin-react"]) framework = "Vite / React";
    else if (deps["express"]) framework = "Express";
    else if (filesList.includes("next.config.js") || filesList.includes("next.config.mjs")) framework = "Next.js";
    else if (filesList.includes("vite.config.ts") || filesList.includes("vite.config.js")) framework = "Vite / React";

    // Package manager detection
    let packageManager = "npm";
    if (filesList.includes("pnpm-lock.yaml")) packageManager = "pnpm";
    else if (filesList.includes("package-lock.json")) packageManager = "npm";
    else if (filesList.includes("yarn.lock")) packageManager = "yarn";
    else if (filesList.includes("bun.lockb")) packageManager = "bun";

    // Languages detection
    const languages: string[] = [];
    const hasTS = filesList.some((p) => p.endsWith(".ts") || p.endsWith(".tsx"));
    const hasJS = filesList.some((p) => p.endsWith(".js") || p.endsWith(".jsx"));
    const hasPython = filesList.some((p) => p.endsWith(".py"));
    const hasGo = filesList.some((p) => p.endsWith(".go"));
    const hasRust = filesList.some((p) => p.endsWith(".rs"));

    if (hasTS) languages.push("TypeScript");
    if (hasJS) languages.push("JavaScript");
    if (hasPython) languages.push("Python");
    if (hasGo) languages.push("Go");
    if (hasRust) languages.push("Rust");
    if (languages.length === 0) languages.push("JavaScript");

    // CI Provider detection
    let ciProvider = "None";
    if (filesList.some((p) => p.startsWith(".github/workflows/"))) ciProvider = "GitHub Actions";
    else if (filesList.includes(".gitlab-ci.yml")) ciProvider = "GitLab CI";
    else if (filesList.includes("circle.yml") || filesList.some((p) => p.startsWith(".circleci/"))) ciProvider = "CircleCI";

    // Docker Support
    const dockerSupport = filesList.includes("Dockerfile") || filesList.includes("docker-compose.yml");

    // Deployment Platform detection
    let deploymentPlatform = "Self-Hosted / Cloud VM";
    if (filesList.includes("vercel.json") || deps["vercel"]) deploymentPlatform = "Vercel";
    else if (filesList.includes("netlify.toml")) deploymentPlatform = "Netlify";
    else if (filesList.includes("fly.toml")) deploymentPlatform = "Fly.io";

    // Config files detection
    const commonConfigs = [
      "tsconfig.json",
      "eslint.config.js",
      "eslint.config.cjs",
      "eslint.config.mjs",
      ".eslintrc.json",
      ".eslintrc.js",
      "prettier.config.js",
      ".prettierrc",
      "tailwind.config.js",
      "tailwind.config.ts",
      "postcss.config.js",
      "vite.config.ts",
      "vite.config.js",
      "next.config.js",
      "next.config.mjs",
      "pnpm-workspace.yaml",
    ];
    const configFiles = filesList.filter((f) => commonConfigs.includes(path.basename(f)));

    return {
      framework,
      packageManager,
      languages,
      ciProvider,
      dockerSupport,
      deploymentPlatform,
      configFiles,
    };
  }

  /**
   * Analyzes connected repository using deterministic steps followed by AI reasoning,
   * saving the resulting RepositoryMemory inside a ContextSnapshot.
   */
  static async analyzeRepository(
    repositoryId: string,
    workspaceId: string
  ): Promise<RepositoryAnalysisResult> {
    logger.info(`[RepositoryAgent] Starting hybrid analysis of repository: ${repositoryId}`);

    // 1. Fetch Repository details
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { project: true },
    });

    if (!repository) {
      throw new Error(`Repository ${repositoryId} not found.`);
    }

    // 2. Fetch File tree list & package.json (metadata only)
    const { filesList, packageJson } = await this.fetchRepositoryFiles(
      repository.owner,
      repository.name,
      repository.defaultBranch
    );

    // 3. Step 1 of hybrid: deterministic detection
    const deterministic = this.runDeterministicInspection(filesList, packageJson);

    // 4. Resolve System feature for database constraints anchoring
    const systemFeature = await this.getOrCreateSystemFeature(
      repository.projectId,
      workspaceId
    );

    // 5. Step 2 of hybrid: AI Analysis reasoning
    // We send a filtered subset of file list to avoid hitting token limits for extremely large repositories.
    const filteredFilesList = filesList
      .filter((f) => !f.includes("/obj/") && !f.includes("/bin/") && !f.includes("/dist/"))
      .slice(0, 700);

    const result = await AgentRunner.run({
      agentType: AgentType.REPO_ANALYZER,
      featureId: systemFeature.id,
      workspaceId,
      promptKey: "repository:analyze",
      schema: repositoryAnalysisSchema,
      inputVariables: {
        owner: repository.owner,
        name: repository.name,
        defaultBranch: repository.defaultBranch,
        framework: deterministic.framework,
        packageManager: deterministic.packageManager,
        languages: deterministic.languages.join(", "),
        ciProvider: deterministic.ciProvider,
        dockerSupport: deterministic.dockerSupport ? "Supported (Dockerfile/compose detected)" : "Not detected",
        deploymentPlatform: deterministic.deploymentPlatform,
        configFiles: deterministic.configFiles.join(", "),
        filesList: filteredFilesList.join("\n"),
      },
    });

    const analysis = result.object as any;
    const agentRunId = result.agentRunId;

    // 6. Build the persistent RepositoryMemory object
    const repositoryMemory: RepositoryMemory = {
      technologyStack: {
        framework: deterministic.framework,
        packageManager: deterministic.packageManager,
        languages: deterministic.languages,
        ciProvider: deterministic.ciProvider,
        dockerSupport: deterministic.dockerSupport,
        deploymentPlatform: deterministic.deploymentPlatform,
        configFiles: deterministic.configFiles,
      },
      detectedModules: analysis.detectedModules || [],
      directoryMap: analysis.directoryMap || [],
      repositoryCapabilities: analysis.repositoryCapabilities || [],
      importantEntryPoints: analysis.importantEntryPoints || [],
      repositoryHealthMetrics: analysis.healthMetrics || {
        fileCount: filesList.length,
        typescriptCoverage: 0,
        testCoverage: 0,
        outdatedDependenciesCount: 0,
        lintErrorEstimate: 0,
        documentationScore: 0,
      },
      dependencyGraph: analysis.dependencyGraph || [],
      majorEntryPoints: analysis.majorEntryPoints || {
        frontendEntry: "",
        backendEntry: "",
        middlewareChain: "",
        apiLayer: "",
        databaseLayer: "",
      },
      summary: analysis.summary,
      architectureSummary: analysis.architectureSummary,
      capabilityReport: analysis.capabilityReport || {
        existingCapabilities: [],
        missingCapabilities: [],
        gapAnalysis: "",
      },
    };

    // Ensure health metrics has total fileCount
    if (repositoryMemory.repositoryHealthMetrics) {
      repositoryMemory.repositoryHealthMetrics.fileCount = filesList.length;
    }

    // 7. Persist inside ContextSnapshot
    try {
      const existingSnapshot = await prisma.contextSnapshot.findUnique({
        where: { agentRunId },
      });

      const updatedSnapshot = {
        ...(existingSnapshot?.snapshot as any || {}),
        repositoryMemory,
        filesIndexed: filesList,
      };

      await prisma.contextSnapshot.update({
        where: { agentRunId },
        data: {
          snapshot: updatedSnapshot,
        },
      });

      // Update repository's webhookSecret to store references as metadata string (reusing existing columns safely)
      await prisma.repository.update({
        where: { id: repositoryId },
        data: {
          webhookSecret: JSON.stringify({
            latestAgentRunId: agentRunId,
            defaultBranch: repository.defaultBranch,
            updatedAt: new Date().toISOString(),
          }),
        },
      });
    } catch (err) {
      logger.error(`[RepositoryAgent] Failed to save RepositoryMemory to database snapshot:`, err);
    }

    return {
      repositoryId,
      agentRunId,
      analysis,
    };
  }

  /**
   * Performs relevance ranking of folders/files against a semantic search query.
   * If a memory snapshot exists, it utilizes the memory technology stack context for better ranking.
   */
  static async searchRelevantAreas(
    repositoryId: string,
    workspaceId: string,
    query: string,
    featureId?: string
  ): Promise<RepositorySearchResponse> {
    logger.info(`[RepositoryAgent] Semantic searching relevant files for repository ${repositoryId} with query: ${query}`);

    // Load repository memory if available
    const memory = await this.loadRepositoryMemory(repositoryId);
    const filesList = await this.loadFilesList(repositoryId);

    const systemFeature = await this.getOrCreateSystemFeature(
      memory?.projectId || "",
      workspaceId
    );

    const techStackText = memory
      ? `Framework: ${memory.technologyStack.framework}, Language: ${memory.technologyStack.languages.join(", ")}`
      : "Standard Node/TypeScript project";

    // Limit files list size for LLM prompt context
    const filteredFilesList = filesList
      .filter((f) => !f.includes("/obj/") && !f.includes("/bin/") && !f.includes("/dist/"))
      .slice(0, 1000);

    const result = await AgentRunner.run({
      agentType: AgentType.REPO_ANALYZER,
      featureId: featureId || systemFeature.id,
      workspaceId,
      promptKey: "repository:search",
      schema: relevantFilesRankingSchema,
      inputVariables: {
        query,
        featureId: featureId || "N/A",
        technologyStackSummary: techStackText,
        filesList: filteredFilesList.join("\n"),
      },
    });

    const searchResponse = result.object as RepositorySearchResponse;

    return {
      featureId,
      query,
      rankedAreas: searchResponse.rankedAreas || [],
    };
  }

  /**
   * Retrieves summary from latest successful run.
   */
  static async getRepositorySummary(repositoryId: string): Promise<string> {
    const memory = await this.loadRepositoryMemory(repositoryId);
    return memory?.summary || "No summary available. Run analyzeRepository first.";
  }

  /**
   * Retrieves tech stack.
   */
  static async getTechnologyStack(repositoryId: string) {
    const memory = await this.loadRepositoryMemory(repositoryId);
    return memory?.technologyStack || null;
  }

  /**
   * Retrieves health metrics.
   */
  static async getRepositoryHealth(repositoryId: string) {
    const memory = await this.loadRepositoryMemory(repositoryId);
    return memory?.repositoryHealthMetrics || null;
  }

  /**
   * Loads repository memory snapshot from DB.
   */
  static async loadRepositoryMemory(
    repositoryId: string
  ): Promise<(RepositoryMemory & { projectId?: string }) | null> {
    try {
      const repository = await prisma.repository.findUnique({
        where: { id: repositoryId },
      });
      if (!repository || !repository.webhookSecret) return null;

      let meta: any = {};
      try {
        meta = JSON.parse(repository.webhookSecret);
      } catch (e) {
        return null;
      }

      if (!meta.latestAgentRunId) return null;

      const snapshot = await prisma.contextSnapshot.findUnique({
        where: { agentRunId: meta.latestAgentRunId },
      });

      if (!snapshot) return null;
      const snapshotParsed = snapshot.snapshot as any;
      if (snapshotParsed.repositoryMemory) {
        return {
          ...snapshotParsed.repositoryMemory,
          projectId: repository.projectId,
        };
      }
    } catch (err) {
      logger.error(`[RepositoryAgent] Failed to load RepositoryMemory from database:`, err);
    }
    return null;
  }

  /**
   * Loads files list from latest successful run.
   */
  static async loadFilesList(repositoryId: string): Promise<string[]> {
    try {
      const repository = await prisma.repository.findUnique({
        where: { id: repositoryId },
      });
      if (!repository || !repository.webhookSecret) return [];

      let meta: any = {};
      try {
        meta = JSON.parse(repository.webhookSecret);
      } catch (e) {
        return [];
      }

      if (!meta.latestAgentRunId) return [];

      const snapshot = await prisma.contextSnapshot.findUnique({
        where: { agentRunId: meta.latestAgentRunId },
      });

      if (!snapshot) return [];
      const snapshotParsed = snapshot.snapshot as any;
      if (Array.isArray(snapshotParsed.filesIndexed)) {
        return snapshotParsed.filesIndexed;
      }
    } catch (err) {
      logger.error(`[RepositoryAgent] Failed to load files tree index:`, err);
    }
    return [];
  }

  /**
   * Resolves or creates a system feature used as anchor for AgentRuns.
   */
  private static async getOrCreateSystemFeature(projectId: string, workspaceId: string) {
    if (!projectId) {
      throw new Error("Cannot get or create system feature: projectId is empty.");
    }
    let feature = await prisma.feature.findFirst({
      where: {
        projectId,
        title: "System: Repository Intelligence",
      },
    });

    if (!feature) {
      feature = await prisma.feature.create({
        data: {
          workspaceId,
          projectId,
          title: "System: Repository Intelligence",
          description: "System feature for storing repository indexing agent runs.",
          status: "DRAFT",
        },
      });
    }
    return feature;
  }

  /**
   * Recursive filesystem search to list all workspace files.
   */
  private static getFilesRecursively(dir: string, baseDir: string = dir): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

      // Filter out files/folders that should not be indexed (binaries, node modules, etc.)
      if (
        file === "node_modules" ||
        file === ".git" ||
        file === ".next" ||
        file === ".turbo" ||
        file === "dist" ||
        file === "build" ||
        file === ".github" ||
        file === ".gemini"
      ) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(this.getFilesRecursively(fullPath, baseDir));
      } else {
        results.push(relativePath);
      }
    }
    return results;
  }

  /**
   * Locate the root of the workspace.
   */
  private static findWorkspaceRoot(): string {
    let current = process.cwd();
    while (current) {
      if (
        fs.existsSync(path.join(current, "pnpm-workspace.yaml")) ||
        fs.existsSync(path.join(current, "package.json"))
      ) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return process.cwd();
  }
}
