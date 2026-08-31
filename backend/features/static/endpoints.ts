import { serveStatic } from "@hono/node-server/serve-static";
import { parties, userSessions } from "db/schema";
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
        const sessionId = getSessionId(request);
        const userId = await User.getUserId(request);
        const origin = c.env.clientIp;
        if (!sessionId || !userId || !origin) {
            if (!sessionId)
                c.header(
                    "Set-Cookie",
                    `sessionId=${crypto.randomUUID()}; SameSite=Strict`,
                );
            return publicPage(c, async () => undefined);
        }

        await db
            .insert(userSessions)
            .values({
                id: sessionId,
                userId,
                origin,
                start: new Date().getTime(),
            })
            .onConflictDoUpdate({
                target: userSessions.userId,
                set: { id: sessionId, origin, start: new Date().getTime() },
            });
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
            new URL(request.url).hostname !== "127.0.0.1"
        )
            return new Response(undefined, { status: 401 });
        return (await asset(c, async () => undefined)) ?? c.notFound();
    });
};
