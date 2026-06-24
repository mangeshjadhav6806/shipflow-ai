"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signUp, signOut } from "@shipflow/auth/client";
import { trpc } from "@/lib/trpc";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shipflow/ui";

export default function WorkspaceTestPage() {
  const { data: sessionData, isPending: isSessionPending, refetch: refetchSession } = useSession();

  // Auth Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Context State (backed by localStorage)
  const [activeOrgId, setActiveOrgId] = useState("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  // Input states
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgUpdateName, setOrgUpdateName] = useState("");
  const [orgUpdateSlug, setOrgUpdateSlug] = useState("");

  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");
  const [wsUpdateName, setWsUpdateName] = useState("");
  const [wsUpdateSlug, setWsUpdateSlug] = useState("");
  const [wsRestoreId, setWsRestoreId] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [acceptToken, setAcceptToken] = useState("");
  const [rejectToken, setRejectToken] = useState("");
  const [updateMemberId, setUpdateMemberId] = useState("");
  const [updateMemberRole, setUpdateMemberRole] = useState("VIEWER");
  const [removeMemberId, setRemoveMemberId] = useState("");
  const [transferOwnerId, setTransferOwnerId] = useState("");

  // JSON result tracker
  const [apiResponse, setApiResponse] = useState<any>(null);

  // Sync state with localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveOrgId(localStorage.getItem("sf-organization-id") || "");
      setActiveWorkspaceId(localStorage.getItem("sf-workspace-id") || "");
    }
  }, []);

  const selectOrg = (id: string) => {
    localStorage.setItem("sf-organization-id", id);
    setActiveOrgId(id);
    // Clear workspace context since it belongs to previous org
    localStorage.removeItem("sf-workspace-id");
    setActiveWorkspaceId("");
    setApiResponse({ message: `Active Organization set to: ${id}. Workspace context cleared.` });
  };

  const selectWorkspace = (id: string) => {
    localStorage.setItem("sf-workspace-id", id);
    setActiveWorkspaceId(id);
    setApiResponse({ message: `Active Workspace set to: ${id}` });
  };

  // Queries
  const { data: orgs, refetch: refetchOrgs } = trpc.organization.list.useQuery(undefined, {
    enabled: !!sessionData?.user,
  });

  const { data: workspaces, refetch: refetchWorkspaces } = trpc.workspace.list.useQuery(
    { organizationId: activeOrgId },
    { enabled: !!sessionData?.user && !!activeOrgId }
  );

  const { data: membersData, refetch: refetchMembers } = trpc.member.list.useQuery(
    undefined,
    { enabled: !!sessionData?.user && !!activeWorkspaceId }
  );

  // Mutations
  const createOrgMutation = trpc.organization.create.useMutation();
  const updateOrgMutation = trpc.organization.update.useMutation();
  const deleteOrgMutation = trpc.organization.delete.useMutation();

  const createWsMutation = trpc.workspace.create.useMutation();
  const updateWsMutation = trpc.workspace.update.useMutation();
  const deleteWsMutation = trpc.workspace.delete.useMutation();
  const archiveWsMutation = trpc.workspace.archive.useMutation();
  const restoreWsMutation = trpc.workspace.restore.useMutation();

  const inviteMemberMutation = trpc.member.invite.useMutation();
  const acceptInviteMutation = trpc.member.accept.useMutation();
  const rejectInviteMutation = trpc.member.reject.useMutation();
  const removeMemberMutation = trpc.member.remove.useMutation();
  const leaveWsMutation = trpc.member.leave.useMutation();
  const transferOwnershipMutation = trpc.member.transferOwnership.useMutation();
  const updateRoleMutation = trpc.member.updateRole.useMutation();

  // Handlers
  const handleSignUp = async () => {
    setAuthError(null);
    try {
      const res = await signUp.email({
        email,
        password,
        name,
      });
      setApiResponse(res);
      refetchSession();
    } catch (err: any) {
      setAuthError(err.message || "Sign up failed");
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const res = await signIn.email({
        email,
        password,
      });
      setApiResponse(res);
      refetchSession();
    } catch (err: any) {
      setAuthError(err.message || "Sign in failed");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setApiResponse({ message: "Signed out successfully" });
      refetchSession();
    } catch (err: any) {
      setAuthError(err.message || "Sign out failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            ShipFlow AI — Backend Playground
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Internal developer utility for verifying Workspace, Organization, and Member RBAC foundations.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Section 1: Auth Controls */}
            <Card className="bg-slate-900/50 border-slate-850 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg text-indigo-300">1. Authentication</CardTitle>
                <CardDescription className="text-slate-400">Register or log in to generate an active session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sessionData ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Signed in as: <strong className="text-emerald-400">{sessionData.user?.email}</strong>
                    </p>
                    <p className="text-xs text-slate-500">User ID: {sessionData.user?.id}</p>
                    <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Name (for Signup)"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {authError && <p className="text-xs text-red-400">{authError}</p>}
                    <div className="flex gap-2">
                      <Button onClick={handleSignIn}>Sign In</Button>
                      <Button onClick={handleSignUp} className="bg-indigo-650 hover:bg-indigo-700">Sign Up</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Organization Controls */}
            <Card className="bg-slate-900/50 border-slate-850 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg text-sky-300">2. Organization Management</CardTitle>
                <CardDescription className="text-slate-400">Create, list, and switch organization contexts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Creation */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Create Organization</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Org Name"
                      className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Org Slug (optional)"
                      className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 w-1/3"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                    />
                    <Button
                      onClick={async () => {
                        try {
                          const res = await createOrgMutation.mutateAsync({ name: orgName, slug: orgSlug || undefined });
                          setApiResponse(res);
                          setOrgName("");
                          setOrgSlug("");
                          refetchOrgs();
                        } catch (err: any) {
                          setApiResponse(err);
                        }
                      }}
                    >
                      Create
                    </Button>
                  </div>
                </div>

                {/* Listing / Selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Organizations</h4>
                    <Button size="sm" onClick={() => refetchOrgs()}>Refresh List</Button>
                  </div>
                  {orgs && orgs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {orgs.map((o) => (
                        <div
                          key={o.id}
                          className={`p-3 rounded border flex flex-col justify-between items-start gap-2 ${
                            activeOrgId === o.id
                              ? "border-sky-500 bg-sky-950/20"
                              : "border-slate-800 bg-slate-950/40"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-sm">{o.name}</p>
                            <p className="text-xs text-slate-500">Slug: {o.slug}</p>
                            <p className="text-[10px] text-slate-600">ID: {o.id}</p>
                          </div>
                          <Button size="sm" onClick={() => selectOrg(o.id)}>
                            {activeOrgId === o.id ? "Selected" : "Select"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No organizations found. Create one above.</p>
                  )}
                </div>

                {/* Edit / Update */}
                {activeOrgId && (
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Active Org</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New Name"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                        value={orgUpdateName}
                        onChange={(e) => setOrgUpdateName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="New Slug"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 w-1/3"
                        value={orgUpdateSlug}
                        onChange={(e) => setOrgUpdateSlug(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          try {
                            const res = await updateOrgMutation.mutateAsync({
                              organizationId: activeOrgId,
                              name: orgUpdateName || undefined,
                              slug: orgUpdateSlug || undefined,
                            });
                            setApiResponse(res);
                            setOrgUpdateName("");
                            setOrgUpdateSlug("");
                            refetchOrgs();
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Update
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            const res = await deleteOrgMutation.mutateAsync({ organizationId: activeOrgId });
                            setApiResponse(res);
                            refetchOrgs();
                            selectOrg("");
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Workspace Controls */}
            <Card className="bg-slate-900/50 border-slate-850 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg text-emerald-300">3. Workspace Management</CardTitle>
                <CardDescription className="text-slate-400">Create, list, restore, and delete workspaces inside current Org</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Creation */}
                {activeOrgId ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Create Workspace</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Workspace Name"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                        value={wsName}
                        onChange={(e) => setWsName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Workspace Slug (optional)"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 w-1/3"
                        value={wsSlug}
                        onChange={(e) => setWsSlug(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          try {
                            const res = await createWsMutation.mutateAsync({
                              organizationId: activeOrgId,
                              name: wsName,
                              slug: wsSlug || undefined,
                            });
                            setApiResponse(res);
                            setWsName("");
                            setWsSlug("");
                            refetchWorkspaces();
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">Select an organization first to manage workspaces.</p>
                )}

                {/* Listing */}
                {activeOrgId && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspaces</h4>
                      <Button size="sm" onClick={() => refetchWorkspaces()}>Refresh</Button>
                    </div>
                    {workspaces && workspaces.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {workspaces.map((w) => (
                          <div
                            key={w.id}
                            className={`p-3 rounded border flex flex-col justify-between items-start gap-2 ${
                              activeWorkspaceId === w.id
                                ? "border-emerald-500 bg-emerald-950/20"
                                : "border-slate-800 bg-slate-950/40"
                            }`}
                          >
                            <div>
                              <p className="font-semibold text-sm">{w.name}</p>
                              <p className="text-xs text-slate-500">Slug: {w.slug}</p>
                              <p className="text-[10px] text-slate-600">ID: {w.id}</p>
                            </div>
                            <Button size="sm" onClick={() => selectWorkspace(w.id)}>
                              {activeWorkspaceId === w.id ? "Selected" : "Select"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No workspaces found inside this Organization.</p>
                    )}
                  </div>
                )}

                {/* Edit / Actions */}
                {activeWorkspaceId && (
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace Actions (Active Workspace)</h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Update Name"
                          className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                          value={wsUpdateName}
                          onChange={(e) => setWsUpdateName(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Update Slug"
                          className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 w-1/3"
                          value={wsUpdateSlug}
                          onChange={(e) => setWsUpdateSlug(e.target.value)}
                        />
                        <Button
                          onClick={async () => {
                            try {
                              const res = await updateWsMutation.mutateAsync({
                                workspaceId: activeWorkspaceId,
                                name: wsUpdateName || undefined,
                                slug: wsUpdateSlug || undefined,
                              });
                              setApiResponse(res);
                              setWsUpdateName("");
                              setWsUpdateSlug("");
                              refetchWorkspaces();
                            } catch (err: any) {
                              setApiResponse(err);
                            }
                          }}
                        >
                          Update
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const res = await archiveWsMutation.mutateAsync({ workspaceId: activeWorkspaceId });
                              setApiResponse(res);
                              refetchWorkspaces();
                              selectWorkspace("");
                            } catch (err: any) {
                              setApiResponse(err);
                            }
                          }}
                        >
                          Archive (Soft Delete)
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const res = await deleteWsMutation.mutateAsync({ workspaceId: activeWorkspaceId });
                              setApiResponse(res);
                              refetchWorkspaces();
                              selectWorkspace("");
                            } catch (err: any) {
                              setApiResponse(err);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Restore workspace */}
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Restore soft-deleted Workspace</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Workspace ID to restore"
                      className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                      value={wsRestoreId}
                      onChange={(e) => setWsRestoreId(e.target.value)}
                    />
                    <Button
                      onClick={async () => {
                        try {
                          const res = await restoreWsMutation.mutateAsync({ workspaceId: wsRestoreId });
                          setApiResponse(res);
                          setWsRestoreId("");
                          refetchWorkspaces();
                        } catch (err: any) {
                          setApiResponse(err);
                        }
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Section 4: Members & Roles Controls */}
            {activeWorkspaceId && (
              <Card className="bg-slate-900/50 border-slate-850 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-300">4. Members, Roles & Invitations</CardTitle>
                  <CardDescription className="text-slate-400">Invite, accept/reject, update role, and remove members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Invite Member */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invite Member</h4>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Member Email"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <select
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="REVIEWER">REVIEWER</option>
                        <option value="DEVELOPER">DEVELOPER</option>
                        <option value="PM">PM</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="OWNER">OWNER</option>
                      </select>
                      <Button
                        onClick={async () => {
                          try {
                            const res = await inviteMemberMutation.mutateAsync({
                              workspaceId: activeWorkspaceId,
                              email: inviteEmail,
                              role: inviteRole as any,
                            });
                            setApiResponse(res);
                            setInviteEmail("");
                            refetchMembers();
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Invite
                      </Button>
                    </div>
                  </div>

                  {/* Accept Invitation */}
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accept Invitation Token</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Invitation Token"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                        value={acceptToken}
                        onChange={(e) => setAcceptToken(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          try {
                            const res = await acceptInviteMutation.mutateAsync({ token: acceptToken });
                            setApiResponse(res);
                            setAcceptToken("");
                            refetchMembers();
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>

                  {/* Reject / Cancel Invitation */}
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reject/Cancel Invitation</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Invitation Token"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                        value={rejectToken}
                        onChange={(e) => setRejectToken(e.target.value)}
                      />
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            const res = await rejectInviteMutation.mutateAsync({ token: rejectToken });
                            setApiResponse(res);
                            setRejectToken("");
                            refetchMembers();
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* Update Member Role */}
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Member Role</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="User ID"
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                        value={updateMemberId}
                        onChange={(e) => setUpdateMemberId(e.target.value)}
                      />
                      <select
                        className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                        value={updateMemberRole}
                        onChange={(e) => setUpdateMemberRole(e.target.value)}
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="REVIEWER">REVIEWER</option>
                        <option value="DEVELOPER">DEVELOPER</option>
                        <option value="PM">PM</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="OWNER">OWNER</option>
                      </select>
                      <Button
                        onClick={async () => {
                          try {
                            const res = await updateRoleMutation.mutateAsync({
                              workspaceId: activeWorkspaceId,
                              userId: updateMemberId,
                              role: updateMemberRole as any,
                            });
                            setApiResponse(res);
                            setUpdateMemberId("");
                            refetchMembers();
                          } catch (err: any) {
                            setApiResponse(err);
                          }
                        }}
                      >
                        Update Role
                      </Button>
                    </div>
                  </div>

                  {/* Remove Member / Leave */}
                  <div className="space-y-2 border-t border-slate-800 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ownership & Members removal</h4>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Remove User ID"
                          className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                          value={removeMemberId}
                          onChange={(e) => setRemoveMemberId(e.target.value)}
                        />
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const res = await removeMemberMutation.mutateAsync({
                                workspaceId: activeWorkspaceId,
                                userId: removeMemberId,
                              });
                              setApiResponse(res);
                              setRemoveMemberId("");
                              refetchMembers();
                            } catch (err: any) {
                              setApiResponse(err);
                            }
                          }}
                        >
                          Remove Member
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New Owner User ID"
                          className="bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100 flex-1"
                          value={transferOwnerId}
                          onChange={(e) => setTransferOwnerId(e.target.value)}
                        />
                        <Button
                          onClick={async () => {
                            try {
                              const res = await transferOwnershipMutation.mutateAsync({
                                workspaceId: activeWorkspaceId,
                                newOwnerId: transferOwnerId,
                              });
                              setApiResponse(res);
                              setTransferOwnerId("");
                              refetchMembers();
                            } catch (err: any) {
                              setApiResponse(err);
                            }
                          }}
                        >
                          Transfer Ownership
                        </Button>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-850">
                        <Button
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const res = await leaveWsMutation.mutateAsync({ workspaceId: activeWorkspaceId });
                              setApiResponse(res);
                              refetchWorkspaces();
                              refetchMembers();
                              selectWorkspace("");
                            } catch (err: any) {
                              setApiResponse(err);
                            }
                          }}
                        >
                          Leave Workspace
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Members & Invitations lists */}
                  <div className="space-y-4 border-t border-slate-800 pt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workspace Members</h4>
                      <Button size="sm" onClick={() => refetchMembers()}>Refresh Members</Button>
                    </div>

                    {membersData?.members && membersData.members.length > 0 ? (
                      <div className="space-y-2">
                        {membersData.members.map((m) => (
                          <div key={m.id} className="p-2 bg-slate-950/40 rounded border border-slate-800 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-semibold">{m.user?.name || "Unknown"} ({m.user?.email})</p>
                              <p className="text-[10px] text-slate-500">User ID: {m.userId}</p>
                              <p className="text-[10px] text-slate-500">Member ID: {m.id}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500 text-indigo-300 font-semibold uppercase text-[10px]">
                              {m.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No members found.</p>
                    )}

                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Pending Invitations</h4>
                    {membersData?.invitations && membersData.invitations.length > 0 ? (
                      <div className="space-y-2">
                        {membersData.invitations.map((inv) => (
                          <div key={inv.id} className="p-2 bg-slate-950/40 rounded border border-slate-800 text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">{inv.email}</span>
                              <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500 text-purple-300 font-semibold uppercase text-[9px]">
                                {inv.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">Token: {inv.token}</p>
                            <p className="text-[10px] text-slate-500">Expires: {new Date(inv.expiresAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No pending invitations.</p>
                    )}
                  </div>

                </CardContent>
              </Card>
            )}

          </div>

          {/* Response Output Column */}
          <div className="space-y-8">
            <Card className="bg-slate-900/50 border-slate-850 h-[calc(100vh-12rem)] flex flex-col sticky top-8 backdrop-blur-md">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-lg text-emerald-400">API Response Console</CardTitle>
                <CardDescription className="text-slate-400">Real-time outcomes and raw JSON data</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4 bg-slate-950/80 font-mono text-xs text-slate-300">
                {apiResponse ? (
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                ) : (
                  <p className="text-slate-600 italic">Trigger any operation to view live payload logs...</p>
                )}
              </CardContent>
              <div className="border-t border-slate-800 p-3 bg-slate-900/30 flex justify-between items-center text-[10px] text-slate-500">
                <span>Org Context: {activeOrgId ? "Active" : "None"}</span>
                <span>WS Context: {activeWorkspaceId ? "Active" : "None"}</span>
              </div>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
}
