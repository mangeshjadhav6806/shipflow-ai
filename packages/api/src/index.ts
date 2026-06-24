export { type Context, createContext } from "./context";
export { type AppRouter, appRouter } from "./root";
export {
  router,
  publicProcedure,
  protectedProcedure,
  withAuth,
  createWorkspaceProcedure,
  createPermissionProcedure,
  createRoleProcedure,
} from "./trpc";

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "./root";
import { discoveryRouter } from "./routers/discovery";
import { prdRouter } from "./routers/prd";
import { planningRouter } from "./routers/planning";
import { githubRouter } from "./routers/github";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type DiscoveryRouter = typeof discoveryRouter;
export type DiscoveryOutputs = inferRouterOutputs<DiscoveryRouter>;

export type PRDRouter = typeof prdRouter;
export type PRDOutputs = inferRouterOutputs<PRDRouter>;

export type PlanningRouter = typeof planningRouter;
export type PlanningOutputs = inferRouterOutputs<PlanningRouter>;

export type GithubRouter = typeof githubRouter;
export type GithubOutputs = inferRouterOutputs<GithubRouter>;


