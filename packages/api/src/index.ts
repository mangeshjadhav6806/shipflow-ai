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

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type DiscoveryRouter = typeof discoveryRouter;
export type DiscoveryOutputs = inferRouterOutputs<DiscoveryRouter>;
