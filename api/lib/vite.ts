import fs from "fs";
import path from "path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

export function serveStaticFiles(app: Hono) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  app.use("*", async (c, next) => {
    await next();
    const ct = c.res.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      c.header("Cache-Control", "no-cache, no-store, must-revalidate");
      c.header("Pragma", "no-cache");
      c.header("Expires", "0");
    }
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}
