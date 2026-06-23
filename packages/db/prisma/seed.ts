import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// =============================================================================
// ShipFlow AI — Database Seed Entry Point
// =============================================================================
// This file is the single entry point for all database seeding.
// It imports and runs domain-specific seeders in dependency order.
//
// Usage:
//   pnpm --filter @shipflow/db db:seed
//
// WARNING: This will INSERT data into the database.
//          Run only against development databases.
// =============================================================================

async function main(): Promise<void> {
  console.log("🌱 ShipFlow AI — Starting database seed...\n");

  // ─── Seed Order (dependency-safe) ─────────────────────────────────────────
  // Seeders are imported and run in order to respect FK constraints.
  //
  // Phase 1 — Identity & Auth (no dependencies)
  // await seedUsers();
  //
  // Phase 2 — Tenancy (depends on Users)
  // await seedOrganizations();
  // await seedWorkspaces();
  // await seedMembers();
  //
  // Phase 3 — Git Integration (depends on Workspaces)
  // await seedRepositories();
  //
  // Phase 4 — Projects & Features (depends on Workspaces + Repos)
  // await seedProjects();
  // await seedFeatures();
  //
  // Phase 5 — Billing (depends on Organizations)
  // await seedSubscriptions();
  //
  // ─── Placeholder (remove when seeders are implemented) ─────────────────────
  console.log("ℹ️  No seed data configured yet.");
  console.log("   Add domain seeders following the commented Phase structure.");

  console.log("\n✅ Seed complete.\n");
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
