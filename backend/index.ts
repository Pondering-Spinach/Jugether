import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "./auth";
import { registerPartyRoutes } from "./features/party/endpoints";
import { registerQueueRoutes } from "./features/queue/endpoints";
import { registerStaticRoutes } from "./features/static/endpoints";
import { registerYtdlpRoutes } from "./features/ytdlp/endpoints";
import { getRuntimeBindings, type RuntimeBindings } from "./routing/runtime";

const app = new Hono<{ Bindings: RuntimeBindings }>();

// Better Auth must be registered before application and catch-all routes.
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

registerStaticRoutes(app);
registerYtdlpRoutes(app);
registerPartyRoutes(app);
registerQueueRoutes(app);
// Retain the former catch-all redirect for routes that have no Hono handler.
app.notFound((c) => c.redirect("/"));

const port = Number(process.env["PORT"] ?? 5222);
serve({
    port,
    // Pass Node connection details through the existing runtime adapter.
    fetch: (request, { incoming }) =>
        app.fetch(request, getRuntimeBindings(incoming)),
});

console.log(`server running on port ${port}`);
