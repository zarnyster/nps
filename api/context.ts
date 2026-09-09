import type { Context as HonoContext } from "hono";
import { authenticateRequest } from "./kimi/auth";

export type Context = {
  req: Request;
  resHeaders: Headers;
  user?: Awaited<ReturnType<typeof authenticateRequest>>;
};

export async function createContext(opts: { req: Request; resHeaders: Headers }): Promise<Context> {
  const ctx: Context = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // неавторизован — оставляем user undefined
  }
  return ctx;
}
