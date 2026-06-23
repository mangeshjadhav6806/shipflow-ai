import { publicProcedure, router } from "./trpc";

export const appRouter = router({
  greeting: publicProcedure.query(() => {
    return { text: "Hello from ShipFlow AI" };
  }),
});

export type AppRouter = typeof appRouter;
