// =============================================================================
// ShipFlow AI — Workspace Service
// =============================================================================
// Business logic for workspace lifecycle operations.
// Handles creation, updates, deletion, and slug generation.
// =============================================================================

import { prisma } from "@shipflow/db";
import type { Workspace, Organization } from "@shipflow/types";
import {
  WorkspaceNotFoundError,
  WorkspaceAlreadyExistsError,
  OrganizationNotFoundError,
} from "@shipflow/shared";

/**
 * Generate a unique slug from a workspace name.
 * Converts to lowercase, replaces spaces/special chars with hyphens.
 * @param name Workspace name
 * @returns Generated slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Find next available slug if base slug is taken.
 * Appends numbers: slug, slug-1, slug-2, etc.
 * @param baseSlug Base slug to check
 * @returns Available slug
 */
async function findAvailableSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * WorkspaceService handles workspace lifecycle and operations.
 */
export class WorkspaceService {
  /**
   * Create a new workspace.
   * @param organizationId Organization to associate with
   * @param name Workspace name
   * @param customSlug Optional custom slug
   * @returns Created workspace
   */
  static async createWorkspace(
    organizationId: string,
    name: string,
    customSlug?: string
  ): Promise<Workspace> {
    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new OrganizationNotFoundError(organizationId);
    }

    // Generate or validate slug
    const baseSlug = customSlug || generateSlug(name);

    // Check if slug is available
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: baseSlug },
    });

    if (existingWorkspace) {
      throw new WorkspaceAlreadyExistsError(baseSlug);
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        organizationId,
        name,
        slug: baseSlug,
      },
    });

    return workspace as Workspace;
  }

  /**
   * Get workspace by ID.
   * @param workspaceId Workspace ID
   * @returns Workspace
   * @throws WorkspaceNotFoundError if not found
   */
  static async getWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new WorkspaceNotFoundError(workspaceId);
    }

    return workspace as Workspace;
  }

  /**
   * Get workspace by slug.
   * @param slug Workspace slug
   * @returns Workspace
   * @throws WorkspaceNotFoundError if not found
   */
  static async getWorkspaceBySlug(slug: string): Promise<Workspace> {
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (!workspace) {
      throw new WorkspaceNotFoundError(slug);
    }

    return workspace as Workspace;
  }

  /**
   * Update workspace metadata.
   * @param workspaceId Workspace ID
   * @param data Update data (name, slug)
   * @returns Updated workspace
   */
  static async updateWorkspace(
    workspaceId: string,
    data: { name?: string; slug?: string }
  ): Promise<Workspace> {
    // Verify workspace exists
    await this.getWorkspace(workspaceId);

    // Check slug availability if changing
    if (data.slug) {
      const existing = await prisma.workspace.findUnique({
        where: { slug: data.slug },
      });

      if (existing && existing.id !== workspaceId) {
        throw new WorkspaceAlreadyExistsError(data.slug);
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    return workspace as Workspace;
  }

  /**
   * Soft delete a workspace.
   * @param workspaceId Workspace ID
   * @returns Deleted workspace
   */
  static async deleteWorkspace(workspaceId: string): Promise<Workspace> {
    // Verify workspace exists
    await this.getWorkspace(workspaceId);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });

    return workspace as Workspace;
  }

  /**
   * Restore a soft-deleted workspace.
   * @param workspaceId Workspace ID
   * @returns Restored workspace
   */
  static async restoreWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: null },
    });

    return workspace as Workspace;
  }

  /**
   * Get all workspaces for an organization.
   * @param organizationId Organization ID
   * @returns Array of workspaces
   */
  static async getOrganizationWorkspaces(organizationId: string): Promise<Workspace[]> {
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });

    return workspaces as Workspace[];
  }

  /**
   * Get all active (non-deleted) workspaces.
   * @returns Array of active workspaces
   */
  static async getActiveWorkspaces(): Promise<Workspace[]> {
    const workspaces = await prisma.workspace.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    return workspaces as Workspace[];
  }
}
