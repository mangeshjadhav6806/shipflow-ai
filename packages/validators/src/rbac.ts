import { z } from "zod";

// =============================================================================
// ShipFlow AI — RBAC & Workspace Validation Schemas
// =============================================================================
// Zod schemas for workspace, member, role, and invitation operations.
// All schemas are designed to be reusable across tRPC, API routes, and services.
// =============================================================================

// -----------
// Slug Validation
// -----------

/** Validates workspace/organization slugs. Alphanumeric and hyphens only. */
export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
  .regex(/^[a-z0-9]/, "Slug must start with a letter or number")
  .regex(/[a-z0-9]$/, "Slug must end with a letter or number");

// -----------
// Workspace Validation
// -----------

export const createWorkspaceSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be at most 100 characters"),
  slug: slugSchema.optional(),
});

export const updateWorkspaceSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be at most 100 characters")
    .optional(),
  slug: slugSchema.optional(),
});

export const deleteWorkspaceSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

// -----------
// Role Validation
// -----------

export const VALID_ROLES = ["OWNER", "ADMIN", "PM", "DEVELOPER", "REVIEWER", "VIEWER"] as const;
export const roleSchema = z.enum(VALID_ROLES);

// -----------
// Member Management
// -----------

export const updateMemberRoleSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  userId: z.string().uuid("Invalid user ID"),
  role: roleSchema,
});

export const removeMemberSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export const transferOwnershipSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  newOwnerId: z.string().uuid("Invalid new owner ID"),
});

export const leaveworkspaceSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

// -----------
// Invitation Management
// -----------

export const createInvitationSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  email: z.string().email("Invalid email address"),
  role: roleSchema.optional().default("VIEWER"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

export const cancelInvitationSchema = z.object({
  invitationId: z.string().uuid("Invalid invitation ID"),
});

export const resendInvitationSchema = z.object({
  invitationId: z.string().uuid("Invalid invitation ID"),
});

// -----------
// Organization Validation
// -----------

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters"),
  slug: slugSchema.optional(),
});

export const updateOrganizationSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name must be at most 100 characters")
    .optional(),
  slug: slugSchema.optional(),
});

// -----------
// Permission Check Schema
// -----------

export const requirePermissionSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  permission: z.string(),
});

// Export types for TypeScript
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type DeleteWorkspaceInput = z.infer<typeof deleteWorkspaceSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type LeaveworkspaceInput = z.infer<typeof leaveworkspaceSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type CancelInvitationInput = z.infer<typeof cancelInvitationSchema>;
export type ResendInvitationInput = z.infer<typeof resendInvitationSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UserRole = (typeof VALID_ROLES)[number];
