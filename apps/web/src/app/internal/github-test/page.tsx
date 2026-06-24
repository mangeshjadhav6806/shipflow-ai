// =============================================================================
// ShipFlow AI — GitHub Intelligence Developer Playground
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { useSession } from "@shipflow/auth/client";
import { trpc } from "@/lib/trpc";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shipflow/ui";

export default function GitHubTestPage() {
  const { data: sessionData } = useSession();

  // Active Context
  const [activeOrgId, setActiveOrgId] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Input states
  const [repoOwner, setRepoOwner] = useState("mangeshjadhav6806");
  const [repoName, setRepoName] = useState("chaiAurCode");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [searchQuery, setSearchQuery] = useState("tRPC router setup");

  // Selection/Response details
  const [activeTab, setActiveTab] = useState<
    "stack" | "health" | "summary" | "capabilities" | "graph" | "search" | "raw"
  >("stack");

  const [connectedRepo, setConnectedRepo] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Sync context with localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveOrgId(localStorage.getItem("sf-organization-id") || "");
      setActiveWorkspaceId(localStorage.getItem("sf-workspace-id") || "");
    }
  }, []);

  // Queries
  const { data: orgs } = trpc.organization.list.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });

  const { data: workspaces } = trpc.workspace.list.useQuery(
    { organizationId: activeOrgId },
    { enabled: !!sessionData?.user && !!activeOrgId }
  );

  const { data: projects, refetch: refetchProjects } = trpc.project.list.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!sessionData?.user && !!activeWorkspaceId }
  );

  // Set default project when list loads
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Query Tech Stack, Health & Summary for Connected Repo
  const { data: repoStack, refetch: refetchStack } = trpc.github.getTechnologyStack.useQuery(
    { workspaceId: activeWorkspaceId, repositoryId: connectedRepo?.id || "" },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!connectedRepo?.id }
  );

  const { data: repoHealth, refetch: refetchHealth } = trpc.github.getRepositoryHealth.useQuery(
    { workspaceId: activeWorkspaceId, repositoryId: connectedRepo?.id || "" },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!connectedRepo?.id }
  );

  const { data: repoSummaryData, refetch: refetchSummary } = trpc.github.getRepositorySummary.useQuery(
    { workspaceId: activeWorkspaceId, repositoryId: connectedRepo?.id || "" },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!connectedRepo?.id }
  );

  // Mutations
  const connectRepoMutation = trpc.github.connectRepository.useMutation();
  const analyzeRepoMutation = trpc.github.analyzeRepository.useMutation();

  const handleSelectOrg = (id: string) => {
    localStorage.setItem("sf-organization-id", id);
    setActiveOrgId(id);
    localStorage.removeItem("sf-workspace-id");
    setActiveWorkspaceId("");
    setSelectedProjectId("");
    setApiResponse({ message: "Organization updated. Select a workspace." });
  };

  const handleSelectWorkspace = (id: string) => {
    localStorage.setItem("sf-workspace-id", id);
    setActiveWorkspaceId(id);
    setSelectedProjectId("");
    setApiResponse({ message: `Active Workspace set to: ${id}` });
  };

  const handleConnectRepo = async () => {
    if (!selectedProjectId) return;
    setApiResponse({ message: "Connecting repository to project..." });
    try {
      const res = await connectRepoMutation.mutateAsync({
        projectId: selectedProjectId,
        owner: repoOwner,
        name: repoName,
        defaultBranch,
        workspaceId: activeWorkspaceId,
      });
      setConnectedRepo(res);
      setApiResponse(res);
      refetchStack();
      refetchHealth();
      refetchSummary();
    } catch (err: any) {
      setApiResponse({ error: err.message || String(err) });
    }
  };

  const handleAnalyzeRepo = async () => {
    if (!connectedRepo?.id) return;
    setApiResponse({ message: "Running hybrid repository analyzer pipeline..." });
    try {
      const res = await analyzeRepoMutation.mutateAsync({
        repositoryId: connectedRepo.id,
        workspaceId: activeWorkspaceId,
      });
      setApiResponse(res);
      refetchStack();
      refetchHealth();
      refetchSummary();
    } catch (err: any) {
      setApiResponse({ error: err.message || String(err) });
    }
  };

  // Lazy dynamic semantic search resolver
  const utils = trpc.useUtils();
  const handleSearchRelevant = async () => {
    if (!connectedRepo?.id || !searchQuery.trim()) return;
    setSearchLoading(true);
    setApiResponse({ message: "Searching relevant areas..." });
    try {
      const res = await utils.client.github.searchRelevantAreas.query({
        repositoryId: connectedRepo.id,
        workspaceId: activeWorkspaceId,
        query: searchQuery,
      });
      setSearchResults(res);
      setApiResponse(res);
    } catch (err: any) {
      setApiResponse({ error: err.message || String(err) });
    } finally {
      setSearchLoading(false);
    }
  };

  // Safe data retrieval from workspace cache queries
  const stack = repoStack?.stack;
  const health = repoHealth?.health;
  const summaryObj = repoSummaryData;

  // Analysis result extracted from latest agent run snapshot
  const analysisResult = apiResponse?.analysis || apiResponse?.snapshot?.repositoryMemory;

  const summary = summaryObj?.summary || analysisResult?.summary;
  const healthMetrics = health || analysisResult?.repositoryHealthMetrics;
  const capabilities = analysisResult?.repositoryCapabilities || [];
  const capabilityReport = analysisResult?.capabilityReport;
  const detectedModules = analysisResult?.detectedModules || [];
  const directoryMap = analysisResult?.directoryMap || [];
  const importantEntryPoints = analysisResult?.importantEntryPoints || [];
  const dependencyGraph = analysisResult?.dependencyGraph || [];
  const majorEntryPoints = analysisResult?.majorEntryPoints;
  const techStack = stack || analysisResult?.technologyStack;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              ShipFlow AI — GitHub Intelligence Playground
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Test and trace hybrid deterministic + AI Repository Analyzer, Dependency Graph, and Semantic Relevance Search.
            </p>
          </div>
          {sessionData?.user && (
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Logged in as</span>
              <span className="text-sm font-medium text-slate-300">{sessionData.user.email}</span>
            </div>
          )}
        </div>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Org & Workspace Selection */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200">1. Context</CardTitle>
              <CardDescription className="text-slate-400">Select active tenant parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Organization
                </label>
                <select
                  value={activeOrgId}
                  onChange={(e) => handleSelectOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Select Organization --</option>
                  {orgs?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Workspace
                </label>
                <select
                  value={activeWorkspaceId}
                  onChange={(e) => handleSelectWorkspace(e.target.value)}
                  disabled={!activeOrgId}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                >
                  <option value="">-- Select Workspace --</option>
                  {workspaces?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Connect Repository details */}
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-200">2. Connect Repository</CardTitle>
              <CardDescription className="text-slate-400">
                Specify GitHub repository parameters to connect to the active project
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={!activeWorkspaceId}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                  >
                    <option value="">-- Select Project --</option>
                    {projects?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Owner / Organization
                  </label>
                  <input
                    type="text"
                    value={repoOwner}
                    onChange={(e) => setRepoOwner(e.target.value)}
                    placeholder="e.g. facebook"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="e.g. react"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Default Branch
                    </label>
                    <input
                      type="text"
                      value={defaultBranch}
                      onChange={(e) => setDefaultBranch(e.target.value)}
                      placeholder="e.g. main"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleConnectRepo}
                      disabled={!selectedProjectId || connectRepoMutation.isLoading}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded text-sm disabled:opacity-50"
                    >
                      {connectRepoMutation.isLoading ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Repo status & Action trigger */}
        {connectedRepo && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-slate-200">Connected: {connectedRepo.owner}/{connectedRepo.name}</CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  Default Branch: <span className="font-mono text-slate-300">{connectedRepo.defaultBranch}</span> · ID: <span className="font-mono text-slate-400 text-xs">{connectedRepo.id}</span>
                </CardDescription>
              </div>
              <div>
                <Button
                  onClick={handleAnalyzeRepo}
                  disabled={analyzeRepoMutation.isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded text-sm disabled:opacity-50"
                >
                  {analyzeRepoMutation.isLoading ? "Running Hybrid Analysis..." : "Trigger Analysis Scan"}
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* API Output */}
        {apiResponse && (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">API Output / Log Trace</h3>
            <pre className="text-xs font-mono max-h-40 overflow-y-auto text-emerald-400 bg-slate-950 p-2 rounded">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Analysis Presentation tabs */}
        {techStack || summary || healthMetrics ? (
          <div className="space-y-6">
            <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
              {[
                { id: "stack", label: "Technology Stack" },
                { id: "health", label: "Repository Health" },
                { id: "summary", label: "Summary & Architecture" },
                { id: "capabilities", label: "Capabilities Report" },
                { id: "graph", label: "Dependency Graph" },
                { id: "search", label: "Relevant Area Search" },
                { id: "raw", label: "Raw Memory Object" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tech Stack */}
            {activeTab === "stack" && techStack && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Technology & Environment</CardTitle>
                    <CardDescription className="text-slate-400">Statically detected parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 pt-2">
                    {[
                      { label: "Framework", value: techStack.framework },
                      { label: "Package Manager", value: techStack.packageManager },
                      { label: "CI/CD Provider", value: techStack.ciProvider },
                      { label: "Deployment Platform", value: techStack.deploymentPlatform },
                      { label: "Docker Support", value: techStack.dockerSupport ? "Yes (Dockerfile/compose detected)" : "No" },
                    ].map((row, idx) => (
                      <div key={idx} className="flex justify-between border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                        <span className="text-sm text-slate-400 font-semibold">{row.label}</span>
                        <span className="text-sm text-emerald-400 font-bold">{row.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Detected Stack & Configurations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Languages Detected</h4>
                      <div className="flex flex-wrap gap-2">
                        {techStack.languages?.map((lang: string, index: number) => (
                          <span key={index} className="text-xs px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-850 font-bold">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Configuration Files Found</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {techStack.configFiles?.map((cfg: string, index: number) => (
                          <code key={index} className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono border border-slate-850">
                            {cfg}
                          </code>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Health metrics */}
            {activeTab === "health" && healthMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { title: "Total Files", value: healthMetrics.fileCount, desc: "Relative path entries indexed" },
                  { title: "TypeScript Coverage", value: `${healthMetrics.typescriptCoverage}%`, desc: "TypeScript coverage estimate" },
                  { title: "Test Coverage Target", value: `${healthMetrics.testCoverage}%`, desc: "Estimated test suites presence" },
                  { title: "Outdated Dependencies", value: healthMetrics.outdatedDependenciesCount, desc: "Package upgrade warnings estimate" },
                  { title: "Lint Violations Estimate", value: healthMetrics.lintErrorEstimate, desc: "Estimated lint health status" },
                  { title: "Documentation Score", value: `${healthMetrics.documentationScore}/100`, desc: "README and docstrings index" },
                ].map((m, idx) => (
                  <Card key={idx} className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">{m.title}</CardDescription>
                      <CardTitle className="text-3xl font-black text-emerald-400 mt-1">{m.value}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-xs text-slate-500">{m.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary & Architecture */}
            {activeTab === "summary" && (
              <div className="space-y-6">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Repository Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-350 leading-relaxed whitespace-pre-wrap">{summary}</p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Architecture Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-350 leading-relaxed whitespace-pre-wrap">{analysisResult?.architectureSummary}</p>
                  </CardContent>
                </Card>

                {/* Directory map */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Directory Mapping</CardTitle>
                    <CardDescription className="text-slate-400">Key folders structural mappings</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2">
                      {directoryMap.map((d: any, idx: number) => (
                        <div key={idx} className="flex gap-4 p-2 bg-slate-950 border border-slate-850 rounded text-sm">
                          <code className="text-emerald-400 font-mono font-bold w-1/3 truncate">{d.path}</code>
                          <span className="text-slate-300 w-2/3">{d.purpose}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Capabilities report */}
            {activeTab === "capabilities" && (
              <div className="space-y-6">
                {capabilityReport && (
                  <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-slate-200">Repository Capability Report</CardTitle>
                      <CardDescription className="text-slate-400">Architecture capabilities gaps analysis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950 border border-slate-850 p-3 rounded">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Existing Features Supported</h4>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                            {capabilityReport.existingCapabilities?.map((c: string, idx: number) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-slate-950 border border-slate-850 p-3 rounded">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Missing / Untouched Features</h4>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">
                            {capabilityReport.missingCapabilities?.map((c: string, idx: number) => (
                              <li key={idx} className="text-amber-400">{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-850 p-3.5 rounded text-sm text-slate-300">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gap Delta Analysis</h4>
                        {capabilityReport.gapAnalysis}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Capabilities detailed listing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {capabilities.map((cap: any, index: number) => (
                    <Card key={index} className="bg-slate-900 border-slate-800">
                      <CardHeader className="pb-2.5">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm font-bold text-slate-200">{cap.name}</CardTitle>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold border ${
                              cap.supported
                                ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                                : "bg-amber-950/20 text-amber-400 border-amber-900/50"
                            }`}
                          >
                            {cap.supported ? "Supported" : "Missing / Stub"}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2">{cap.description}</p>
                        {cap.missingDetails && (
                          <div className="text-[11px] text-slate-500 italic bg-slate-950 p-2 rounded">
                            Missing Details: {cap.missingDetails}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Dependency Graph & Entry points */}
            {activeTab === "graph" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dependency Graph */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Module Dependency Graph</CardTitle>
                    <CardDescription className="text-slate-400">Workspace level relationships (deterministic / AI)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dependencyGraph.length === 0 ? (
                      <div className="text-slate-500 text-center py-6 text-sm">No dependency edges detected.</div>
                    ) : (
                      dependencyGraph.map((edge: any, index: number) => (
                        <div key={index} className="flex items-center gap-4 bg-slate-950 border border-slate-850 p-3 rounded">
                          <span className="font-mono text-slate-300 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800 text-xs">
                            {edge.from}
                          </span>
                          <span className="text-emerald-400 font-black">➔</span>
                          <span className="font-mono text-slate-300 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800 text-xs">
                            {edge.to}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Major Entry points */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Major Architecture Entry Points</CardTitle>
                    <CardDescription className="text-slate-400">Key layers mapping entry files</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5 pt-2">
                    {majorEntryPoints ? (
                      [
                        { label: "Frontend Entry", value: majorEntryPoints.frontendEntry },
                        { label: "Backend Entry", value: majorEntryPoints.backendEntry },
                        { label: "Middleware Chain", value: majorEntryPoints.middlewareChain },
                        { label: "API Layer Entry", value: majorEntryPoints.apiLayer },
                        { label: "Database Layer Entry", value: majorEntryPoints.databaseLayer },
                      ].map((row, idx) => (
                        <div key={idx} className="flex flex-col border-b border-slate-800 pb-2 last:border-0 last:pb-0 gap-1">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{row.label}</span>
                          <code className="text-xs text-emerald-400 font-mono">{row.value || "Not found"}</code>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-center py-6 text-sm">Major entry points data not analyzed.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Entry points details list */}
                <Card className="bg-slate-900 border-slate-800 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Other Important Files</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {importantEntryPoints.map((ep: any, index: number) => (
                      <div key={index} className="flex gap-4 bg-slate-950 border border-slate-850 p-2.5 rounded text-sm items-center">
                        <code className="text-emerald-400 font-mono text-xs w-1/3 truncate">{ep.path}</code>
                        <span className="text-slate-400 text-xs w-2/3">{ep.description}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Semantic Search */}
            {activeTab === "search" && (
              <div className="space-y-6">
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Semantic Relevance Search</CardTitle>
                    <CardDescription className="text-slate-400">Search relevant files and directories for a query</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. auth routes setup or database prisma client connection"
                      className="flex-1 bg-slate-950 border border-slate-850 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                    <Button
                      onClick={handleSearchRelevant}
                      disabled={searchLoading || !searchQuery.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 text-sm rounded font-medium disabled:opacity-50"
                    >
                      {searchLoading ? "Searching..." : "Search"}
                    </Button>
                  </CardContent>
                </Card>

                {searchResults?.rankedAreas && (
                  <div className="space-y-4">
                    {searchResults.rankedAreas.map((area: any, index: number) => (
                      <Card key={index} className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-3 border-b border-slate-800/50">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold text-slate-200">
                              Module: <span className="font-mono text-emerald-400">{area.affectedModule}</span>
                            </CardTitle>
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/50 font-bold">
                              Confidence: {area.confidence}%
                            </span>
                          </div>
                          <CardDescription className="text-xs font-mono text-slate-400 mt-1">
                            Dir: {area.affectedDirectory}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Reasoning</span>
                            <p className="text-xs text-slate-300">{area.reasoning}</p>
                          </div>
                          {area.affectedFiles && area.affectedFiles.length > 0 && (
                            <div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Relevant Files</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {area.affectedFiles.map((file: string, fIdx: number) => (
                                  <code key={fIdx} className="text-[11px] bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                                    {file}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Raw JSON */}
            {activeTab === "raw" && (
              <pre className="text-xs bg-slate-900 border border-slate-800 rounded p-4 max-h-[500px] overflow-y-auto text-emerald-300 font-mono">
                {JSON.stringify(analysisResult || summaryObj || stack, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <Card className="bg-slate-900 border-slate-800 py-16 text-center text-slate-500">
            Select an organization, workspace, project and connect a repository to run analyses.
          </Card>
        )}
      </div>
    </div>
  );
}
