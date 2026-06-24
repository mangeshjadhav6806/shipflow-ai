// =============================================================================
// ShipFlow AI — PRD Intelligence Engine Developer Playground
// =============================================================================

"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "@shipflow/auth/client";
import { trpc } from "@/lib/trpc";
import type { PRDOutputs, DiscoveryOutputs } from "@shipflow/api";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shipflow/ui";

type PRDData = PRDOutputs["getPRD"];
type VersionHistory = PRDOutputs["listVersions"];
type CompareResult = PRDOutputs["compareVersions"];
type DiscoveryFeatures = DiscoveryOutputs["listFeatures"];

type ActiveView = "json" | "markdown" | "versions" | "compare";

export default function PRDTestPage() {
  const { data: sessionData } = useSession();

  const [activeOrgId, setActiveOrgId] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("markdown");
  const [compareVersionA, setCompareVersionA] = useState(1);
  const [compareVersionB, setCompareVersionB] = useState(2);
  const [apiLog, setApiLog] = useState<Record<string, string | number | boolean | object | null> | null>(null);

  // Sync from localStorage after mount (SSR-safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveOrgId(localStorage.getItem("sf-organization-id") ?? "");
      setActiveWorkspaceId(localStorage.getItem("sf-workspace-id") ?? "");
    }
  }, []);

  // Queries
  const { data: workspaces } = trpc.workspace.list.useQuery(
    { organizationId: activeOrgId },
    { enabled: !!sessionData?.user && !!activeOrgId }
  );

  const { data: rawFeatures, refetch: refetchFeatures } = trpc.discovery.listFeatures.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!sessionData?.user && !!activeWorkspaceId }
  );

  // Only show features that are in PRD-eligible states
  const features = rawFeatures?.filter(
    (f) =>
      f.status === "READY_FOR_PRD" ||
      f.status === "PRD_GENERATED" ||
      f.status === "PRD_APPROVED"
  ) as DiscoveryFeatures | undefined;

  const {
    data: prdData,
    refetch: refetchPRD,
    isLoading: isPRDLoading,
  } = trpc.prd.getPRD.useQuery(
    { featureId: selectedFeatureId, workspaceId: activeWorkspaceId },
    { enabled: !!selectedFeatureId && !!activeWorkspaceId, retry: false }
  );

  const { data: versionHistory, refetch: refetchVersions } = trpc.prd.listVersions.useQuery(
    { featureId: selectedFeatureId, workspaceId: activeWorkspaceId },
    { enabled: !!selectedFeatureId && !!activeWorkspaceId, retry: false }
  );

  const { data: compareResult, refetch: refetchCompare } = trpc.prd.compareVersions.useQuery(
    {
      featureId: selectedFeatureId,
      workspaceId: activeWorkspaceId,
      versionA: compareVersionA,
      versionB: compareVersionB,
    },
    { enabled: false, retry: false }
  );

  // Mutations
  const createPRDMutation = trpc.prd.createPRD.useMutation();
  const regeneratePRDMutation = trpc.prd.regeneratePRD.useMutation();

  const handleCreatePRD = async () => {
    if (!selectedFeatureId || !activeWorkspaceId) return;
    setApiLog({ message: "Generating PRD via AI engine... this may take 15–30 seconds." });
    try {
      const res = await createPRDMutation.mutateAsync({
        featureId: selectedFeatureId,
        workspaceId: activeWorkspaceId,
      });
      setApiLog({ success: true, version: res.version, agentRunId: res.agentRunId });
      refetchPRD();
      refetchVersions();
      setActiveView("markdown");
    } catch (err) {
      if (err instanceof Error) {
        setApiLog({ error: err.message });
      } else {
        setApiLog({ error: String(err) });
      }
    }
  };

  const handleRegeneratePRD = async () => {
    if (!selectedFeatureId || !activeWorkspaceId) return;
    setApiLog({ message: "Re-generating PRD (new version)... this may take 15–30 seconds." });
    try {
      const res = await regeneratePRDMutation.mutateAsync({
        featureId: selectedFeatureId,
        workspaceId: activeWorkspaceId,
      });
      setApiLog({ success: true, version: res.version, agentRunId: res.agentRunId });
      refetchPRD();
      refetchVersions();
      setActiveView("markdown");
    } catch (err) {
      if (err instanceof Error) {
        setApiLog({ error: err.message });
      } else {
        setApiLog({ error: String(err) });
      }
    }
  };

  const handleDownloadMarkdown = useCallback(() => {
    if (!prdData?.markdownContent) return;
    const blob = new Blob([prdData.markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prd-v${prdData.version}-${selectedFeatureId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [prdData, selectedFeatureId]);

  const handleCompare = async () => {
    setApiLog({ message: `Comparing v${compareVersionA} vs v${compareVersionB}...` });
    await refetchCompare();
    setActiveView("compare");
  };

  const isGenerating = createPRDMutation.isPending || regeneratePRDMutation.isPending;
  const hasPRD = !!prdData;

  if (!sessionData?.user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Card className="bg-slate-900/40 border-slate-800 max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-400">Authentication Required</CardTitle>
            <CardDescription>Log in via the workspace playground first.</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/internal/workspace-test">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Go to Auth Playground</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              ShipFlow AI — PRD Intelligence Playground
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Generate, view, compare, and download production-quality PRDs from approved features.
            </p>
          </div>
          {sessionData.user && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Authenticated as</p>
              <p className="text-xs font-semibold text-emerald-400">{sessionData.user.email}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left sidebar */}
          <div className="lg:col-span-4 space-y-4">

            {/* Workspace selection */}
            <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="py-3">
                <CardTitle className="text-xs uppercase tracking-wider text-slate-400">Active Workspace</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 w-full"
                  value={activeWorkspaceId}
                  onChange={(e) => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("sf-workspace-id", e.target.value);
                    }
                    setActiveWorkspaceId(e.target.value);
                    setSelectedFeatureId("");
                  }}
                >
                  <option value="">Select workspace…</option>
                  {workspaces?.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Feature list (PRD-eligible only) */}
            {activeWorkspaceId && (
              <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="py-3 flex flex-row justify-between items-center">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-400">
                    PRD-Eligible Features
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => refetchFeatures()}>
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {features && features.length > 0 ? (
                    <div className="divide-y divide-slate-850 max-h-[300px] overflow-y-auto">
                      {features.map((f) => (
                        <button
                          key={f.id}
                          className={`w-full text-left p-3 flex justify-between items-center hover:bg-slate-900/60 transition-colors ${
                            selectedFeatureId === f.id ? "bg-slate-900 text-emerald-300 font-medium" : ""
                          }`}
                          onClick={() => {
                            setSelectedFeatureId(f.id);
                            setApiLog(null);
                          }}
                        >
                          <div className="truncate pr-2">
                            <p className="text-xs truncate">{f.title ?? "Untitled"}</p>
                            <p className="text-[10px] text-slate-500 truncate">{f.description}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${
                            f.status === "PRD_GENERATED"
                              ? "bg-emerald-950 border-emerald-500/30 text-emerald-400"
                              : f.status === "PRD_APPROVED"
                              ? "bg-teal-950 border-teal-500/30 text-teal-400"
                              : "bg-amber-950 border-amber-500/30 text-amber-400"
                          }`}>
                            {f.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 p-4 text-center">
                      No approved features. Run the discovery pipeline first.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* PRD Actions */}
            {selectedFeatureId && (
              <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-400">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!hasPRD ? (
                    <Button
                      className="w-full bg-emerald-700 hover:bg-emerald-600 text-xs"
                      onClick={handleCreatePRD}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "⏳ Generating PRD..." : "⚡ Generate PRD"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full bg-indigo-700 hover:bg-indigo-600 text-xs"
                        onClick={handleRegeneratePRD}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "⏳ Regenerating..." : "🔄 Regenerate PRD (New Version)"}
                      </Button>
                      <Button
                        className="w-full bg-slate-700 hover:bg-slate-600 text-xs"
                        onClick={handleDownloadMarkdown}
                        disabled={!prdData?.markdownContent}
                      >
                        ⬇️ Download Markdown
                      </Button>
                    </>
                  )}

                  {/* Compare controls */}
                  {hasPRD && versionHistory && (versionHistory.currentVersion ?? 0) > 1 && (
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Compare Versions</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          max={versionHistory.currentVersion ?? 1}
                          value={compareVersionA}
                          onChange={(e) => setCompareVersionA(parseInt(e.target.value, 10))}
                          className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs w-16 text-center"
                          placeholder="v1"
                        />
                        <span className="text-slate-500 text-xs self-center">vs</span>
                        <input
                          type="number"
                          min={1}
                          max={versionHistory.currentVersion ?? 1}
                          value={compareVersionB}
                          onChange={(e) => setCompareVersionB(parseInt(e.target.value, 10))}
                          className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs w-16 text-center"
                          placeholder="v2"
                        />
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-violet-800 hover:bg-violet-700"
                          onClick={handleCompare}
                        >
                          Compare
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main panel */}
          <div className="lg:col-span-8 space-y-4">
            {selectedFeatureId && (
              <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="border-b border-slate-850 pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base text-emerald-300">
                        {features?.find((f) => f.id === selectedFeatureId)?.title ?? "Selected Feature"}
                      </CardTitle>
                      {hasPRD && (
                        <CardDescription className="text-xs text-slate-400 mt-0.5">
                          PRD Version {prdData.version} · Last updated {new Date(prdData.updatedAt).toLocaleString()}
                        </CardDescription>
                      )}
                    </div>
                    {hasPRD && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { refetchPRD(); refetchVersions(); }}>
                        Refresh
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {/* View Tabs */}
                {hasPRD && (
                  <div className="px-4 pt-3 flex gap-4 text-xs font-semibold text-slate-400 border-b border-slate-850 pb-2">
                    {(["markdown", "json", "versions", "compare"] as ActiveView[]).map((tab) => (
                      <button
                        key={tab}
                        className={`pb-1 capitalize ${activeView === tab ? "text-emerald-400 border-b-2 border-emerald-500" : ""}`}
                        onClick={() => setActiveView(tab)}
                      >
                        {tab === "json" ? "Raw JSON" : tab === "versions" ? "Version History" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                )}

                <CardContent className="pt-4">
                  {isPRDLoading && (
                    <div className="text-center py-12 text-slate-500 text-sm">Loading PRD data…</div>
                  )}

                  {!hasPRD && !isPRDLoading && (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      No PRD generated yet for this feature. Click &quot;Generate PRD&quot; to start.
                    </div>
                  )}

                  {/* Markdown View */}
                  {hasPRD && activeView === "markdown" && (
                    <div className="prose prose-invert prose-sm max-w-none max-h-[600px] overflow-y-auto">
                      <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {prdData.markdownContent}
                      </pre>
                    </div>
                  )}

                  {/* JSON View */}
                  {hasPRD && activeView === "json" && (
                    <div className="max-h-[600px] overflow-y-auto">
                      <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 p-4 rounded border border-slate-850 leading-relaxed">
                        {JSON.stringify(prdData.document, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Version History */}
                  {hasPRD && activeView === "versions" && versionHistory && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-400">
                        Current version: <strong className="text-emerald-400">v{versionHistory.currentVersion}</strong>
                      </p>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {versionHistory.versions.map((v) => (
                          <div
                            key={v.agentRunId}
                            className={`p-3 rounded border text-xs ${v.isCurrent ? "border-emerald-500/40 bg-emerald-950/10" : "border-slate-850 bg-slate-950/40"}`}
                          >
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-200">Version {v.versionNumber}</span>
                              {v.isCurrent && <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded font-bold">CURRENT</span>}
                            </div>
                            <p className="text-slate-500 mt-1">Created: {new Date(v.createdAt).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">Run: {v.agentRunId}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compare View */}
                  {hasPRD && activeView === "compare" && compareResult && (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      <p className="text-xs text-slate-400 pb-2 border-b border-slate-850">
                        {compareResult.summary}
                      </p>
                      {compareResult.diff.map((entry) => (
                        <div
                          key={entry.field}
                          className={`p-3 rounded border text-xs ${
                            entry.changeType === "MODIFIED"
                              ? "border-amber-500/30 bg-amber-950/10"
                              : entry.changeType === "ADDED"
                              ? "border-emerald-500/30 bg-emerald-950/10"
                              : entry.changeType === "REMOVED"
                              ? "border-red-500/30 bg-red-950/10"
                              : "border-slate-800"
                          }`}
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-mono text-slate-300 font-semibold">{entry.field}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              entry.changeType === "MODIFIED" ? "bg-amber-950 text-amber-400" :
                              entry.changeType === "ADDED" ? "bg-emerald-950 text-emerald-400" :
                              entry.changeType === "REMOVED" ? "bg-red-950 text-red-400" :
                              "bg-slate-900 text-slate-500"
                            }`}>
                              {entry.changeType}
                            </span>
                          </div>
                          {entry.changeType !== "UNCHANGED" && (
                            <pre className="text-[10px] text-slate-400 overflow-auto">
                              {JSON.stringify(entry.versionB, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedFeatureId && (
              <Card className="bg-slate-900/40 border-slate-850 p-12 text-center text-slate-500 text-sm">
                Select a PRD-eligible feature from the sidebar to get started.
              </Card>
            )}

            {/* API Log */}
            {apiLog && (
              <Card className="bg-slate-900/40 border-slate-800">
                <CardHeader className="py-3 flex flex-row justify-between items-center">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-400">API Response</CardTitle>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setApiLog(null)}>Clear</Button>
                </CardHeader>
                <CardContent>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-3 rounded border border-slate-850 overflow-auto max-h-[200px]">
                    {JSON.stringify(apiLog, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
