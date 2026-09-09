import * as cookie from "cookie";
import { createRouter, publicQuery } from "./middleware";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "../contracts/constants";

const STUB_USER = {
  id: 0,
  unionId: "local-open-access",
  name: "Редакция",
  email: null,
  avatar: null,
  role: "admin" as const,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  lastSignInAt: new Date(0),
};

export const authRouter = createRouter({
  me: publicQuery.query((opts) => opts.ctx.user ?? STUB_USER),
  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase(),
        secure: opts.secure,
        maxAge: 0,
      })
    );
    return { success: true };
  }),
});
