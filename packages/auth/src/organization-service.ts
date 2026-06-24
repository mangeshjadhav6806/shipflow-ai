// =============================================================================
// ShipFlow AI — Organization Service
// =============================================================================
// Business logic for organization lifecycle operations.
// Handles creation, updates, soft deletion, and workspace relationships.
// =============================================================================

import { prisma } from "@shipflow/db";
import type { Organization } from "@shipflow/types";
import { OrganizationNotFoundError } from "@shipflow/shared";

/**
 * Generate a unique slug from an organization name.
 * Converts to lowercase, replaces spaces/special chars with hyphens.
 * @param name Organization name
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
 * OrganizationService handles organization lifecycle operations.
 */
export class OrganizationService {
  /**
   * Create a new organization, default workspace, and user membership.
   * Runs inside a Prisma transaction for transactional integrity.
   * @param name Organization name
   * @param userId Creator user ID (assigned as OWNER of default workspace)
   * @param customSlug Optional custom slug
   * @returns Created organization
   */
  static async createOrganization(
    name: string,
    userId: string,
    customSlug?: string
  ): Promise<Organization> {
    const baseSlug = customSlug || generateSlug(name);

    // Check slug availability
    const existing = await prisma.organization.findUnique({
      where: { slug: baseSlug },
    });

    if (existing) {
      throw new Error(`Organization slug "${baseSlug}" is already taken`);
    }

    // Run transaction to create Org, Default Workspace, and Member
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug: baseSlug,
        },
      });

      // Generate a default workspace name and slug
      const wsName = `${name} Workspace`;
      const baseWsSlug = generateSlug(wsName);
      let wsSlug = baseWsSlug;
      let counter = 1;

      // Ensure workspace slug uniqueness
      while (true) {
        const existingWs = await tx.workspace.findUnique({
          where: { slug: wsSlug },
        });
        if (!existingWs) {
          break;
        }
        wsSlug = `${baseWsSlug}-${counter}`;
        counter++;
      }

      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: wsName,
          slug: wsSlug,
        },
      });

      // Create member as OWNER
      await tx.member.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: "OWNER",
        },
      });

      return org;
    });

    return organization as Organization;
  }

  /**
   * Get an organization by ID.
   * @param organizationId Organization ID
   * @returns Organization
   * @throws OrganizationNotFoundError if not found or soft-deleted
   */
  static async getOrganization(organizationId: string): Promise<Organization> {
    const org = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
    });

    if (!org) {
      throw new OrganizationNotFoundError(organizationId);
    }

    return org as Organization;
  }

  /**
   * Update organization metadata.
   * @param organizationId Organization ID
   * @param data Update details
   * @returns Updated organization
   */
  static async updateOrganization(
    organizationId: string,
    data: { name?: string; slug?: string }
  ): Promise<Organization> {
    // Verify existence
    await this.getOrganization(organizationId);

    if (data.slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug: data.slug },
      });

      if (existing && existing.id !== organizationId) {
        throw new Error(`Organization slug "${data.slug}" is already taken`);
      }
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data,
    });

    return org as Organization;
  }

  /**
   * Soft delete an organization and all associated workspaces/memberships.
   * @param organizationId Organization ID
   * @returns Deleted organization
   */
  static async deleteOrganization(organizationId: string): Promise<Organization> {
    // Verify existence
    await this.getOrganization(organizationId);

    const deletedOrg = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: { deletedAt: new Date() },
      });

      // Find all workspaces under this organization
      const workspaces = await tx.workspace.findMany({
        where: { organizationId },
        select: { id: true },
      });

      const workspaceIds = workspaces.map((w) => w.id);

      if (workspaceIds.length > 0) {
        // Soft delete workspaces
        await tx.workspace.updateMany({
          where: { organizationId },
          data: { deletedAt: new Date() },
        });

        // Soft delete memberships inside those workspaces
        await tx.member.updateMany({
          where: {
            workspaceId: { in: workspaceIds },
          },
          data: { deletedAt: new Date() },
        });
      }

      return org;
    });

    return deletedOrg as Organization;
  }

  /**
   * Get all organizations that a user has workspace membership in.
   * @param userId User ID
   * @returns Array of Organizations
   */
  static async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await prisma.member.findMany({
      where: {
        userId,
        deletedAt: null,
        workspace: {
          deletedAt: null,
          organization: {
            deletedAt: null,
          },
        },
      },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
      },
    });

    const orgsMap = new Map<string, Organization>();
    for (const membership of memberships) {
      const org = membership.workspace.organization;
      if (org) {
        orgsMap.set(org.id, org as Organization);
      }
    }

    return Array.from(orgsMap.values());
  }
}
