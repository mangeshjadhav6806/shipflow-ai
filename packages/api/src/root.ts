import { publicProcedure, router } from "./trpc";
import { organizationRouter } from "./routers/organization";
import { workspaceRouter } from "./routers/workspace";
import { memberRouter } from "./routers/member";
import { projectRouter } from "./routers/project";
import { discoveryRouter } from "./routers/discovery";

export const appRouter = router({
  greeting: publicProcedure.query(() => {
    return { text: "Hello from ShipFlow AI" };
  }),
  organization: organizationRouter,
  workspace: workspaceRouter,
  member: memberRouter,
  project: projectRouter,
  discovery: discoveryRouter,
});

export type AppRouter = typeof appRouter;

