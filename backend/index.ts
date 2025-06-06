import { routes as partyEndpoints } from "./features/party/endpoints";
import { routes as queueEndpoints } from "./features/queue/endpoints";
import { routes as assetRoutes } from "./features/static/endpoints";
import { routes as userEndpoints } from "./features/user/endpoints";
import { routes as ytdlpEndpoints } from "./features/ytdlp/endpoints";
import type { RouteDeclaration } from "./routing/types";

const routingRules: RouteDeclaration[] = [
    ...assetRoutes,
    ...ytdlpEndpoints,
    ...partyEndpoints,
    ...queueEndpoints,
    ...userEndpoints,
];

Bun.serve({
    port: 5222,
    idleTimeout: -1,
    fetch: async (req, server) => {
        const url = new URL(req.url);

        for (const rule of routingRules) {
            if (rule[0](url, req.method)) return rule[1](req, url, server);
        }

        return Response.redirect("/");
    },
});

console.log("server running on port 5222");
