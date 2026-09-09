import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./auth-router";
import { categoryRulesRouter, projectsRouter, reviewsRouter, statusesRouter } from "./reviews-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  projects: projectsRouter,
  statuses: statusesRouter,
  categoryRules: categoryRulesRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
