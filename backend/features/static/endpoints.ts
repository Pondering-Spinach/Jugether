import { serveStatic } from "@hono/node-server/serve-static";
import { parties } from "db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { frontendDist } from "../../routing/static";
import { getSessionId } from "../../routing/utils";
import { User } from "../user/services";

const publicPage = serveStatic({ root: frontendDist, path: "index.html" });
const portalPage = serveStatic({ root: frontendDist, path: "portal.html" });
const asset = serveStatic({ root: frontendDist });

export const registerStaticRoutes = (app: App) => {
    app.get("/", async (c) => {
        const request = c.req.raw;
        const userId = await User.getUserId(request);
        if (!userId) return publicPage(c, async () => undefined);
        const defaultParty = await db.query.parties.findFirst({
            where: and(eq(parties.active, true), eq(parties.hostId, userId)),
            columns: { id: true },
        });
        let partyId = defaultParty?.id;
        if (!partyId) {
            partyId = crypto.randomUUID();
            await db.insert(parties).values({ id: partyId, hostId: userId });
        }
        return c.redirect("/host?id=" + partyId);
    });

    app.get("/portal", (c) => portalPage(c, async () => undefined));

    app.get("/assets/*", async (c) => {
        //TODO: disable for dev only (source map)
        const request = c.req.raw;
        if (
            !getSessionId(request) &&
            !(await User.getUserId(request)) &&
            new URL(request.url).hostname !== "127.0.0.1"
        )
            return new Response(undefined, { status: 401 });
        return (await asset(c, async () => undefined)) ?? c.notFound();
    });
};
