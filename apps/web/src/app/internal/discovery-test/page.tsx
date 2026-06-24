// =============================================================================
// ShipFlow AI — Discovery Agent Developer Playground
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { useSession } from "@shipflow/auth/client";
import { trpc } from "@/lib/trpc";
import type { DiscoveryOutputs } from "@shipflow/api";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shipflow/ui";

export default function DiscoveryTestPage() {
  const { data: sessionData } = useSession();

  // Active Context
  const [activeOrgId, setActiveOrgId] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  // Creation inputs
  const [projectName, setProjectName] = useState("");
  const [rawRequestText, setRawRequestText] = useState("");
  
  // Selected feature details
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Action tracker/response viewer
  const [apiResponse, setApiResponse] = useState<Record<string, string | number | boolean | object | null> | null>(null);
  const [activeTab, setActiveTab] = useState<"pipeline" | "spec" | "logs" | "metrics">("pipeline");

  // Sync context with localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveOrgId(localStorage.getItem("sf-organization-id") || "");
      const wsId = localStorage.getItem("sf-workspace-id") || "";
      setActiveWorkspaceId(wsId);
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

  const { data: features, refetch: refetchFeatures } = trpc.discovery.listFeatures.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!sessionData?.user && !!activeWorkspaceId }
  );

  const { data: rawFeatureDetails, refetch: refetchFeatureDetails } = trpc.discovery.getFeatureDetails.useQuery(
    { workspaceId: activeWorkspaceId, featureId: selectedFeatureId },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!selectedFeatureId }
  );
  const featureDetails = (rawFeatureDetails as object) as DiscoveryOutputs["getFeatureDetails"] | undefined;

  // Set default project when list loads
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Mutations
  const createProjectMutation = trpc.project.create.useMutation();
  const submitRequestMutation = trpc.discovery.submitRequest.useMutation();
  const answerClarificationMutation = trpc.discovery.answerClarification.useMutation();

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

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    try {
      const res = await createProjectMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        name: projectName,
      });
      setApiResponse(res);
      setProjectName("");
      refetchProjects();
    } catch (err) {
      if (err instanceof Error) {
        setApiResponse({ message: err.message });
      } else if (err && typeof err === "object") {
        setApiResponse(err as Record<string, string | number | boolean | object | null>);
      } else {
        setApiResponse({ message: String(err) });
      }
    }
  };

  const handleSubmitRequest = async () => {
    if (!rawRequestText.trim() || !selectedProjectId) return;
    setApiResponse({ message: "Submitting request to Discovery Agent..." });
    try {
      const res = await submitRequestMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        projectId: selectedProjectId,
        rawText: rawRequestText,
      });
      setApiResponse(res);
      setRawRequestText("");
      refetchFeatures();
      setSelectedFeatureId(res.featureId);
    } catch (err) {
      if (err instanceof Error) {
        setApiResponse({ message: err.message });
      } else if (err && typeof err === "object") {
        setApiResponse(err as Record<string, string | number | boolean | object | null>);
      } else {
        setApiResponse({ message: String(err) });
      }
    }
  };

  const handleSubmitAnswers = async () => {
    if (!featureDetails || !selectedFeatureId) return;
    const unanswered = featureDetails.feature.questions.filter(
      (q) => !answers[q.id] && !q.answer
    );
    if (unanswered.length > 0) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const payload = Object.entries(answers).map(([questionId, answerText]) => ({
      questionId,
      answerText,
    }));

    setApiResponse({ message: "Submitting answers to agent..." });
    try {
      const res = await answerClarificationMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
        featureId: selectedFeatureId,
        answers: payload,
      });
      setApiResponse(res);
      setAnswers({});
      refetchFeatureDetails();
      refetchFeatures();
    } catch (err) {
      if (err instanceof Error) {
        setApiResponse({ message: err.message });
      } else if (err && typeof err === "object") {
        setApiResponse(err as Record<string, string | number | boolean | object | null>);
      } else {
        setApiResponse({ message: String(err) });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              ShipFlow AI — Discovery Playground
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Test and trace the AI Feature Discovery, requirement clarification, and duplicate detection workflow.
            </p>
          </div>
          {sessionData?.user && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Authenticated as</p>
              <p className="text-xs font-semibold text-emerald-400">{sessionData.user.email}</p>
            </div>
          )}
        </div>

        {!sessionData?.user ? (
          <Card className="bg-slate-900/40 border-slate-800 p-6 text-center max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-red-400">Authentication Required</CardTitle>
              <CardDescription>
                You must log in using the backend playground first to access development routes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/internal/workspace-test">
                <Button className="bg-indigo-600 hover:bg-indigo-700 w-full mt-2">
                  Go to Auth / Workspace Playground
                </Button>
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Context, Projects, Features (span 5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Context Selector */}
              <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Context Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500 font-semibold uppercase">Organization</label>
                      <select
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100"
                        value={activeOrgId}
                        onChange={(e) => handleSelectOrg(e.target.value)}
                      >
                        <option value="">Select Org</option>
                        {orgs?.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500 font-semibold uppercase">Workspace</label>
                      <select
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100"
                        value={activeWorkspaceId}
                        onChange={(e) => handleSelectWorkspace(e.target.value)}
                        disabled={!activeOrgId}
                      >
                        <option value="">Select Workspace</option>
                        {workspaces?.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Projects Management */}
              {activeWorkspaceId && (
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Create new project name"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 flex-1"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                      />
                      <Button size="sm" onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
                        Create
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Discovery Request Submission */}
              {activeWorkspaceId && (
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-indigo-400">Submit Feature Request</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500 font-semibold uppercase">Target Project</label>
                      <select
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 w-full"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                      >
                        {projects && projects.length > 0 ? (
                          projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))
                        ) : (
                          <option value="">No projects available — create one first</option>
                        )}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500 font-semibold uppercase">Feature Details</label>
                      <textarea
                        rows={5}
                        placeholder="Enter raw feature description... (Tip: include the word 'vague' or 'duplicate' to test specific branches in mock mode!)"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 w-full focus:outline-none focus:border-indigo-500"
                        value={rawRequestText}
                        onChange={(e) => setRawRequestText(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full bg-indigo-650 hover:bg-indigo-700"
                      onClick={handleSubmitRequest}
                      disabled={!selectedProjectId || !rawRequestText.trim() || submitRequestMutation.isPending}
                    >
                      {submitRequestMutation.isPending ? "Running Pipeline..." : "Process Feature Request"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Feature requests in workspace list */}
              {activeWorkspaceId && (
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="py-4 flex flex-row justify-between items-center">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Feature Submissions</CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => refetchFeatures()}>Refresh</Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {features && features.length > 0 ? (
                      <div className="divide-y divide-slate-850 max-h-[300px] overflow-y-auto">
                        {features.map((f) => (
                          <button
                            key={f.id}
                            className={`w-full text-left p-3 flex justify-between items-center transition-colors hover:bg-slate-900/60 ${
                              selectedFeatureId === f.id ? "bg-slate-900 text-indigo-300 font-medium" : ""
                            }`}
                            onClick={() => {
                              setSelectedFeatureId(f.id);
                              setApiResponse(null);
                            }}
                          >
                            <div className="truncate pr-2">
                              <p className="text-xs truncate">{f.title || "Untitled feature"}</p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{f.description}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                              f.status === "READY_FOR_PRD"
                                ? "bg-emerald-950 border-emerald-500/30 text-emerald-400"
                                : f.status === "CLARIFYING"
                                ? "bg-amber-950 border-amber-500/30 text-amber-400"
                                : "bg-slate-950 border-slate-800 text-slate-400"
                            }`}>
                              {f.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 p-4 text-center">No features submitted yet.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Execution details & JSON (span 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Feature Pipeline Viewer */}
              {selectedFeatureId && featureDetails ? (
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="border-b border-slate-850 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-indigo-300">
                          {featureDetails.feature.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400 mt-1">
                          ID: {featureDetails.feature.id}
                        </CardDescription>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => refetchFeatureDetails()}>
                        Refresh Details
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    
                    {/* Navigation Tabs */}
                    <div className="flex border-b border-slate-850 pb-2 gap-4 text-xs font-semibold text-slate-400">
                      <button
                        className={`pb-1 ${activeTab === "pipeline" ? "text-indigo-400 border-b-2 border-indigo-500" : ""}`}
                        onClick={() => setActiveTab("pipeline")}
                      >
                        Pipeline Status
                      </button>
                      <button
                        className={`pb-1 ${activeTab === "spec" ? "text-indigo-400 border-b-2 border-indigo-500" : ""}`}
                        onClick={() => setActiveTab("spec")}
                      >
                        Specifications
                      </button>
                      <button
                        className={`pb-1 ${activeTab === "logs" ? "text-indigo-400 border-b-2 border-indigo-500" : ""}`}
                        onClick={() => setActiveTab("logs")}
                      >
                        Agent Run Logs
                      </button>
                      <button
                        className={`pb-1 ${activeTab === "metrics" ? "text-indigo-400 border-b-2 border-indigo-500" : ""}`}
                        onClick={() => setActiveTab("metrics")}
                      >
                        Observability Metrics
                      </button>
                    </div>

                    {/* Tab 1: Pipeline Status */}
                    {activeTab === "pipeline" && (
                      <div className="space-y-6">
                        {/* Summary details */}
                        <div className="p-4 bg-slate-950/60 rounded border border-slate-850 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Original Description</p>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {featureDetails.feature.description}
                          </p>
                        </div>

                        {/* Clarifications Panel */}
                        {featureDetails.feature.status === "CLARIFYING" && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-amber-400">
                              ⚠️ Clarification Questions Requested by Agent
                            </h3>
                            <div className="space-y-4">
                              {featureDetails.feature.questions.map((q) => (
                                <div key={q.id} className="p-4 bg-amber-950/10 border border-amber-900/30 rounded-lg space-y-3">
                                  <p className="text-xs font-medium text-slate-200">{q.question}</p>
                                  {q.options && (
                                    <div className="flex gap-2">
                                      {(q.options as string[]).map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          className={`text-[10px] px-2 py-1 rounded border border-slate-800 ${
                                            answers[q.id] === opt ? "bg-indigo-950 border-indigo-500 text-indigo-300" : "bg-slate-900"
                                          }`}
                                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {!q.answer ? (
                                    <input
                                      type="text"
                                      placeholder="Type your answer..."
                                      className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 w-full focus:outline-none focus:border-amber-500"
                                      value={answers[q.id] || ""}
                                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                    />
                                  ) : (
                                    <div className="text-xs bg-slate-950/40 p-2 rounded border border-slate-850">
                                      <p className="text-[10px] text-slate-500 uppercase">Your Answered Response</p>
                                      <p className="text-emerald-400 mt-1">{q.answer.answer}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {featureDetails.feature.questions.some((q) => !q.answer) && (
                              <Button
                                className="w-full bg-amber-600 hover:bg-amber-700"
                                onClick={handleSubmitAnswers}
                                disabled={answerClarificationMutation.isPending}
                              >
                                {answerClarificationMutation.isPending ? "Submitting..." : "Submit Clarification Answers"}
                              </Button>
                            )}
                          </div>
                        )}

                        {featureDetails.feature.status === "READY_FOR_PRD" && (
                          <div className="p-4 bg-emerald-950/10 border border-emerald-900/30 rounded-lg flex items-center gap-3">
                            <span className="text-xl">✅</span>
                            <div>
                              <p className="text-xs font-semibold text-emerald-400">Approved for Requirements Stage</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Feature has high confidence score and has been successfully mapped into a full requirement specification.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Specification details */}
                    {activeTab === "spec" && (
                      <div className="space-y-4">
                        {featureDetails.feature.prd ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-semibold text-indigo-400">Generated Feature Specification</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono">
                                Version {featureDetails.feature.prd.version}
                              </span>
                            </div>
                            <pre className="p-4 bg-slate-950/60 rounded border border-slate-850 text-xs font-mono overflow-auto max-h-[400px] text-slate-300">
                              {JSON.stringify(JSON.parse(featureDetails.feature.prd.content), null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 text-center py-8">
                            No specifications generated. Feature must reach READY_FOR_PRD status first.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Detailed run logs */}
                    {activeTab === "logs" && (
                      <div className="space-y-6">
                        {featureDetails.feature.agentRuns.map((run) => (
                          <div key={run.id} className="space-y-2">
                            <div className="flex justify-between items-center text-xs text-slate-400">
                              <span className="font-semibold text-indigo-300 uppercase">{run.agentType} Agent Run</span>
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                run.status === "SUCCESS" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                              }`}>
                                {run.status}
                              </span>
                            </div>
                            <div className="p-4 bg-slate-950 text-[11px] font-mono rounded border border-slate-850 h-[250px] overflow-y-auto space-y-1">
                              {run.logs.map((l) => (
                                <p key={l.id} className={
                                  l.logLevel === "error" ? "text-red-400" : l.logLevel === "warn" ? "text-amber-400" : "text-slate-300"
                                }>[{l.logLevel.toUpperCase()}] {l.message}</p>
                              ))}
                              {run.logs.length === 0 && <p className="text-slate-600">No logs recorded for this run.</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tab 4: Observability metrics */}
                    {activeTab === "metrics" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {featureDetails.metrics.map((met) => (
                          <Card key={met.agentRunId} className="bg-slate-950/60 border-slate-850">
                            <CardHeader className="p-4 border-b border-slate-900">
                              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">{met.agentType} Metrics</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Provider / Model:</span>
                                <span className="font-semibold">{met.providerName} ({met.modelName})</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Duration:</span>
                                <span className="font-semibold">{met.latencyMs}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Retries:</span>
                                <span className="font-semibold">{met.retryCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Total Input / Output Tokens:</span>
                                <span className="font-semibold">{met.inputTokens} / {met.outputTokens}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-900 pt-2 mt-2">
                                <span className="text-slate-400 font-semibold">Estimated Cost (USD):</span>
                                <span className="text-emerald-400 font-semibold">${Number(met.estimatedCostUsd).toFixed(6)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {featureDetails.metrics.length === 0 && (
                          <p className="text-xs text-slate-500 col-span-2 text-center py-8">No metrics available.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-slate-900/40 border-slate-850 p-8 text-center text-slate-500">
                  Select a feature from the submissions list on the left to inspect detailed traces.
                </Card>
              )}

              {/* Raw JSON Responses Log panel */}
              {apiResponse && (
                <Card className="bg-slate-900/40 border-slate-800">
                  <CardHeader className="py-4 flex flex-row justify-between items-center">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Response Console</CardTitle>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setApiResponse(null)}>Clear</Button>
                  </CardHeader>
                  <CardContent>
                    <pre className="p-4 bg-slate-950 rounded border border-slate-850 text-xs font-mono overflow-auto max-h-[300px] text-slate-300">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
