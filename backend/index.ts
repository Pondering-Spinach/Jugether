import { Hono } from "hono";
import { registerPartyRoutes } from "./features/party/endpoints";
import { registerQueueRoutes } from "./features/queue/endpoints";
import { registerStaticRoutes } from "./features/static/endpoints";
import { registerUserRoutes } from "./features/user/endpoints";
import { registerYtdlpRoutes } from "./features/ytdlp/endpoints";
import { getRuntimeBindings, type RuntimeBindings } from "./routing/runtime";

const app = new Hono<{ Bindings: RuntimeBindings }>();

// Retain the former catch-all redirect for routes that have no Hono handler.
app.notFound((c) => c.redirect("/"));

registerStaticRoutes(app);
registerYtdlpRoutes(app);
registerPartyRoutes(app);
registerQueueRoutes(app);
registerUserRoutes(app);

Bun.serve({
    port: 5222,
    idleTimeout: -1,
    fetch: (request, server) => app.fetch(request, getRuntimeBindings(request, server)),
});

console.log("server running on port 5222");
