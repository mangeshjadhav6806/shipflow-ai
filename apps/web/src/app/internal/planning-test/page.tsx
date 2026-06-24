// =============================================================================
// ShipFlow AI — Planning Agent Developer Playground
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

export default function PlanningTestPage() {
  const { data: sessionData } = useSession();

  // Active Context
  const [activeOrgId, setActiveOrgId] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  // Selected feature details
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [activeTab, setActiveTab] = useState<
    "metrics" | "milestones" | "tasks" | "epics" | "testing" | "execution" | "strategy" | "raw"
  >("metrics");

  const [apiResponse, setApiResponse] = useState<any>(null);

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

  const { data: features, refetch: refetchFeatures } = trpc.discovery.listFeatures.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!sessionData?.user && !!activeWorkspaceId }
  );

  // Find the selected feature from features list to get status & title
  const selectedFeature = features?.find((f) => f.id === selectedFeatureId);

  // Query PRD details for selected feature
  const { data: prdDetails, refetch: refetchPRDDetails } = trpc.prd.getPRD.useQuery(
    { workspaceId: activeWorkspaceId, featureId: selectedFeatureId },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!selectedFeatureId }
  );

  const prdId = prdDetails?.id;

  // Query Plan details for selected PRD
  const { data: planResponse, refetch: refetchPlan, isLoading: planLoading } = trpc.planning.getPlan.useQuery(
    { workspaceId: activeWorkspaceId, prdId: prdId || "" },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!prdId }
  );

  // Query Planning Metrics for selected PRD
  const { data: planningMetrics, refetch: refetchMetrics } = trpc.planning.getPlanningMetrics.useQuery(
    { workspaceId: activeWorkspaceId, prdId: prdId || "" },
    { enabled: !!sessionData?.user && !!activeWorkspaceId && !!prdId }
  );

  // Mutations
  const generatePlanMutation = trpc.planning.generatePlan.useMutation();
  const regeneratePlanMutation = trpc.planning.regeneratePlan.useMutation();

  const handleSelectOrg = (id: string) => {
    localStorage.setItem("sf-organization-id", id);
    setActiveOrgId(id);
    localStorage.removeItem("sf-workspace-id");
    setActiveWorkspaceId("");
    setSelectedFeatureId("");
    setApiResponse({ message: "Organization updated. Select a workspace." });
  };

  const handleSelectWorkspace = (id: string) => {
    localStorage.setItem("sf-workspace-id", id);
    setActiveWorkspaceId(id);
    setSelectedFeatureId("");
    setApiResponse({ message: `Active Workspace set to: ${id}` });
  };

  const handleGeneratePlan = async () => {
    if (!prdId) return;
    setApiResponse({ message: "Generating engineering plan from PRD..." });
    try {
      const res = await generatePlanMutation.mutateAsync({
        prdId,
        workspaceId: activeWorkspaceId,
      });
      setApiResponse(res);
      refetchFeatures();
      refetchPRDDetails();
      refetchPlan();
      refetchMetrics();
    } catch (err: any) {
      setApiResponse({ error: err.message || String(err) });
    }
  };

  const handleRegeneratePlan = async () => {
    if (!prdId) return;
    setApiResponse({ message: "Regenerating engineering plan..." });
    try {
      const res = await regeneratePlanMutation.mutateAsync({
        prdId,
        workspaceId: activeWorkspaceId,
      });
      setApiResponse(res);
      refetchFeatures();
      refetchPRDDetails();
      refetchPlan();
      refetchMetrics();
    } catch (err: any) {
      setApiResponse({ error: err.message || String(err) });
    }
  };

  // Safe variables
  const plan = planResponse?.plan;
  const metrics = planningMetrics?.metrics || plan?.metrics;
  const milestones = planningMetrics?.milestones || plan?.milestones || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              ShipFlow AI — Planning Playground
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Test and trace the Planning Intelligence Engine, execution graph, metrics, and milestones.
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

          {/* Feature Selection */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200">2. Select Feature</CardTitle>
              <CardDescription className="text-slate-400">Choose feature to plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Feature
                </label>
                <select
                  value={selectedFeatureId}
                  onChange={(e) => setSelectedFeatureId(e.target.value)}
                  disabled={!activeWorkspaceId}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                >
                  <option value="">-- Select Feature --</option>
                  {features?.map((f) => (
                    <option key={f.id} value={f.id}>
                      [{f.status}] {f.title}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFeature && (
                <div className="bg-slate-950 border border-slate-800 rounded p-3 space-y-1">
                  <div className="text-xs text-slate-500">Status: <span className="font-semibold text-violet-400">{selectedFeature.status}</span></div>
                  <div className="text-xs text-slate-500">PRD ID: <span className="font-mono text-slate-300">{prdId || "None (Generate PRD first)"}</span></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planning Actions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-200">3. Planning Actions</CardTitle>
              <CardDescription className="text-slate-400">Trigger plan generation</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 justify-center min-h-[120px]">
              <Button
                onClick={handleGeneratePlan}
                disabled={!prdId || generatePlanMutation.isLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded text-sm disabled:opacity-50"
              >
                {generatePlanMutation.isLoading ? "Generating..." : "Generate Engineering Plan"}
              </Button>
              {plan && (
                <Button
                  onClick={handleRegeneratePlan}
                  disabled={!prdId || regeneratePlanMutation.isLoading}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium py-2 rounded text-sm disabled:opacity-50"
                >
                  {regeneratePlanMutation.isLoading ? "Regenerating..." : "Regenerate Plan"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* API Response Display */}
        {apiResponse && (
          <div className="bg-slate-900 border border-slate-800 rounded p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">API Output / Log Trace</h3>
            <pre className="text-xs font-mono max-h-40 overflow-y-auto text-emerald-400 bg-slate-950 p-2 rounded">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Plan Display Panel */}
        {planLoading ? (
          <div className="text-center py-12 text-slate-500">Loading engineering plan...</div>
        ) : plan ? (
          <div className="space-y-6">
            {/* Tab navigation */}
            <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
              {[
                { id: "metrics", label: "Planning Metrics" },
                { id: "milestones", label: "Milestones" },
                { id: "tasks", label: "Tasks" },
                { id: "epics", label: "Epics" },
                { id: "testing", label: "Testing Strategy" },
                { id: "execution", label: "Execution waves" },
                { id: "strategy", label: "Implementation Strategy" },
                { id: "raw", label: "Raw JSON" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-violet-500 text-violet-400 bg-violet-950/20"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab contents */}
            {activeTab === "metrics" && metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { title: "Total Tasks", value: metrics.totalTasks, desc: "Tasks generated" },
                  { title: "Total Story Points", value: metrics.totalStoryPoints, desc: "Sizing summary" },
                  { title: "Estimated Hours", value: `${metrics.estimatedHours}h`, desc: "Total labor estimate" },
                  { title: "Critical Path Length", value: metrics.criticalPathLength, desc: "Sequential task count" },
                  {
                    title: "Parallelization",
                    value: `${metrics.parallelizationPercentage.toFixed(1)}%`,
                    desc: "Concurrency opportunity",
                  },
                  { title: "Avg Confidence", value: `${metrics.averageConfidence}%`, desc: "Feasibility trust score" },
                  { title: "Overall Risk Score", value: `${metrics.riskScore}/100`, desc: "Plan complexity metric" },
                  { title: "Testing Coverage", value: `${metrics.testingCoverage}%`, desc: "Target coverage metric" },
                ].map((m, idx) => (
                  <Card key={idx} className="bg-slate-900 border-slate-800 text-slate-100">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">{m.title}</CardDescription>
                      <CardTitle className="text-3xl font-black text-violet-400 mt-1">{m.value}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-xs text-slate-500">{m.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "milestones" && (
              <div className="space-y-6">
                {milestones.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">No milestones generated.</div>
                ) : (
                  milestones.map((m: any) => (
                    <Card key={m.id} className="bg-slate-900 border-slate-800">
                      <CardHeader className="border-b border-slate-800/50 pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-slate-200 text-lg flex items-center gap-2">
                            <span className="bg-violet-950 text-violet-400 border border-violet-800 px-2 py-0.5 rounded text-xs uppercase font-mono">
                              {m.id}
                            </span>
                            {m.title}
                          </CardTitle>
                          <span className="text-xs text-slate-500 font-mono">
                            {m.taskIds?.length || 0} task(s)
                          </span>
                        </div>
                        <CardDescription className="text-slate-400 text-sm mt-1">
                          {m.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {m.taskIds?.map((tid: string) => {
                            const task = plan.tasks.find((t) => t.id === tid);
                            if (!task) return null;
                            return (
                              <div
                                key={tid}
                                className="flex justify-between items-center bg-slate-950 border border-slate-850 hover:border-slate-800 transition-colors p-3 rounded text-sm"
                              >
                                <div>
                                  <span className="font-mono text-slate-500 font-semibold mr-2">{tid}</span>
                                  <span className="text-slate-200 font-medium">{task.title}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                    SP: {task.storyPoints}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                                      task.complexity === "HIGH"
                                        ? "bg-rose-950/20 text-rose-400 border-rose-900/50"
                                        : task.complexity === "MEDIUM"
                                        ? "bg-amber-950/20 text-amber-400 border-amber-900/50"
                                        : "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                                    }`}
                                  >
                                    {task.complexity}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-6">
                {plan.tasks.map((task) => (
                  <Card key={task.id} className="bg-slate-900 border-slate-800">
                    <CardHeader className="pb-3 border-b border-slate-800/50">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <CardTitle className="text-slate-200 text-lg flex items-center gap-2">
                          <span className="font-mono text-violet-400">{task.id}</span>
                          {task.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {task.affectedAreas.map((area, index) => (
                            <span key={index} className="text-xs px-2 py-0.5 rounded bg-cyan-950/30 text-cyan-400 border border-cyan-900/50">
                              {area}
                            </span>
                          ))}
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850">
                            Epic: {task.epicId}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850">
                            Story Points: {task.storyPoints} ({task.estimatedHours}h)
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                              task.complexity === "HIGH"
                                ? "bg-rose-950/20 text-rose-400 border-rose-900/50"
                                : task.complexity === "MEDIUM"
                                ? "bg-amber-950/20 text-amber-400 border-amber-900/50"
                                : "bg-emerald-950/20 text-emerald-400 border-emerald-900/50"
                            }`}
                          >
                            Complexity: {task.complexity}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Description */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                        <p className="text-sm text-slate-300">{task.description}</p>
                      </div>

                      {/* Files Affected */}
                      {task.filesAffected && task.filesAffected.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Files Affected</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {task.filesAffected.map((file, fIdx) => (
                              <code key={fIdx} className="text-xs bg-slate-950 border border-slate-850 px-2 py-1 rounded text-slate-400 font-mono">
                                {file}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Blockers */}
                      {task.blockers && task.blockers.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blockers (Depends On)</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {task.blockers.map((blocker, bIdx) => (
                              <span key={bIdx} className="text-xs font-mono bg-red-950/20 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
                                {blocker}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Acceptance Criteria */}
                      {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Acceptance Criteria</h4>
                          <ul className="list-disc pl-5 text-sm text-slate-300 space-y-0.5">
                            {task.acceptanceCriteria.map((ac, acIdx) => (
                              <li key={acIdx}>{ac}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                        {/* Risk & Confidence */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Confidence Score</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-emerald-400">{task.confidence.score}%</span>
                              <span className="text-xs text-slate-500">— {task.confidence.reason}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Task Risk Analysis</h4>
                            <div className="bg-slate-950 border border-slate-850 rounded p-2.5 space-y-1">
                              <div className="text-xs">
                                <span className="font-semibold text-slate-400">Risk Level:</span>{" "}
                                <span
                                  className={`font-bold ${
                                    task.riskAnalysis.level === "HIGH"
                                      ? "text-rose-400"
                                      : task.riskAnalysis.level === "MEDIUM"
                                      ? "text-amber-400"
                                      : "text-emerald-400"
                                  }`}
                                >
                                  {task.riskAnalysis.level}
                                </span>
                              </div>
                              <div className="text-xs text-slate-300">
                                <span className="font-semibold text-slate-400">Issue:</span> {task.riskAnalysis.description}
                              </div>
                              <div className="text-xs text-emerald-400">
                                <span className="font-semibold text-slate-400">Mitigation:</span> {task.riskAnalysis.mitigation}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Task Reasoning */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Structured Reasoning</h4>
                          <div className="bg-slate-950 border border-slate-850 rounded p-2.5 space-y-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-400 block mb-0.5">Why This Task Exists:</span>
                              <span className="text-slate-300">{task.reasoning.whyThisTaskExists}</span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-400 block mb-0.5">Why This Order:</span>
                              <span className="text-slate-300">{task.reasoning.whyThisOrder}</span>
                            </div>
                            <div>
                              <span className="font-bold text-slate-400 block mb-0.5">Why This Depends On:</span>
                              <span className="text-slate-300">{task.reasoning.whyThisDependsOn}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "epics" && (
              <div className="grid grid-cols-1 gap-6">
                {plan.epics.map((epic) => (
                  <Card key={epic.id} className="bg-slate-900 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-slate-200 text-lg flex items-center gap-2">
                        <span className="font-mono text-violet-400">{epic.id}</span>
                        {epic.title}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm">{epic.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="border-t border-slate-800 pt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Epic Risk Analysis</h4>
                      <div className="bg-slate-950 border border-slate-850 rounded p-3 space-y-1">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-400">Risk Level:</span>{" "}
                          <span
                            className={`font-bold ${
                              epic.riskAnalysis.level === "HIGH"
                                ? "text-rose-400"
                                : epic.riskAnalysis.level === "MEDIUM"
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {epic.riskAnalysis.level}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="font-semibold text-slate-400">Issue:</span> {epic.riskAnalysis.description}
                        </div>
                        <div className="text-xs text-emerald-400">
                          <span className="font-semibold text-slate-400">Mitigation:</span> {epic.riskAnalysis.mitigation}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "testing" && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-200">Structured Testing Strategy</CardTitle>
                  <CardDescription className="text-slate-400">Coverage and strategy parameters per testing category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { title: "Unit Testing", content: plan.testingStrategy.unit },
                    { title: "Integration Testing", content: plan.testingStrategy.integration },
                    { title: "End-to-End Testing", content: plan.testingStrategy.endToEnd },
                    { title: "Performance Testing", content: plan.testingStrategy.performance },
                    { title: "Security Testing", content: plan.testingStrategy.security },
                  ].map((t, idx) => (
                    <div key={idx} className="border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                      <h4 className="text-sm font-semibold text-violet-400 mb-1">{t.title}</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{t.content}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === "execution" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Critical Path */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Critical Path</CardTitle>
                    <CardDescription className="text-slate-400">Longest dependency pipeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {plan.executionMetadata.criticalPath.map((tid, index) => {
                        const task = plan.tasks.find((t) => t.id === tid);
                        return (
                          <div key={tid} className="flex items-center gap-3">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-violet-950 border border-violet-850 text-xs font-bold text-violet-400 font-mono">
                              {index + 1}
                            </span>
                            <div className="flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 p-2.5 rounded text-sm flex justify-between items-center">
                              <div>
                                <span className="font-mono text-slate-500 font-semibold mr-2">{tid}</span>
                                <span className="text-slate-300">{task?.title || "Unknown Task"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Parallel Work Groups */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Parallel Work Groups</CardTitle>
                    <CardDescription className="text-slate-400">Concurrent work groups (zero dependencies)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.executionMetadata.parallelWorkGroups.map((group, gIdx) => (
                      <div key={gIdx} className="bg-slate-950 border border-slate-850 rounded p-3.5 space-y-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group {gIdx + 1}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.map((tid) => {
                            const task = plan.tasks.find((t) => t.id === tid);
                            return (
                              <div
                                key={tid}
                                className="text-xs font-semibold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded flex items-center gap-1.5 text-slate-300"
                              >
                                <span className="font-mono text-violet-400">{tid}</span>
                                <span>{task?.title || "Unknown"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "strategy" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phases */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Implementation Phases</CardTitle>
                    <CardDescription className="text-slate-400">Phases sequence strategy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {plan.implementationStrategy.implementationPhases.map((phase, pIdx) => (
                      <div key={pIdx} className="bg-slate-950 border border-slate-850 rounded p-4 space-y-2">
                        <h4 className="text-sm font-bold text-violet-400">{phase.name}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{phase.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {phase.taskIds.map((tid) => (
                            <span key={tid} className="text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-slate-400">
                              {tid}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Commits */}
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Recommended Commit Sequence</CardTitle>
                    <CardDescription className="text-slate-400">Sequential commits list strategy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {plan.implementationStrategy.recommendedCommitSequence.map((commit, cIdx) => (
                        <div key={cIdx} className="flex gap-3 text-sm bg-slate-950 border border-slate-850 p-3 rounded">
                          <span className="font-mono text-violet-400 font-bold">#{cIdx + 1}</span>
                          <span className="text-slate-300 font-mono">{commit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "raw" && (
              <pre className="text-xs bg-slate-900 border border-slate-800 rounded p-4 max-h-[500px] overflow-y-auto text-violet-300 font-mono">
                {JSON.stringify(plan, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg py-16 text-center text-slate-500">
            Select an organization, workspace, and feature with a PRD to display its engineering plan.
          </div>
        )}
      </div>
    </div>
  );
}
