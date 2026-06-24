import { z } from "zod";

export const featureRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

// Re-export RBAC validation schemas
export * from "./rbac";
export * from "./discovery";

