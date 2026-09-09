import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { env } from "./lib/env";
import { Paths } from "../contracts/constants";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { appRouter } from "./router";
import { createContext } from "./context";
import { serveStaticFiles } from "./lib/vite";

const app = new Hono();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

app.get(Paths.oauthCallback, createOAuthCallbackHandler());

app.post("/api/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json({ error: "Файл не передан" }, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { parseFile, importRows } = await import("./queries/import");
    const rows = parseFile(buffer, file.name);
    if (rows.length === 0) {
      return c.json({ error: "Не удалось распознать строки. Проверьте формат файла." }, 400);
    }
    const result = await importRows(rows);
    return c.json(result);
  } catch (e: any) {
    console.error("[upload]", e);
    return c.json({ error: e?.message || "Ошибка импорта" }, 500);
  }
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  serveStaticFiles(app);
  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
