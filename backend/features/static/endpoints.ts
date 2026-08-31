import { parties, userSessions } from "db/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "../../routing/app";
import { join } from "path";
import { db } from "../../db";
import { getSessionId } from "../../routing/utils";
import { User } from "../user/services";


export const registerStaticRoutes = (app: App) => {
    app.get("/", async (c) => {
        const request = c.req.raw;
        const sessionId = getSessionId(request);
        const userId = await User.getUserId(request);
        const origin = c.env.clientIp;
        if (!sessionId || !userId || !origin) {
            return new Response(
                Bun.file("../frontend/dist/src/pages/public/index.html"),
                !sessionId
                    ? { headers: { "Set-Cookie": `sessionId=${crypto.randomUUID()}; SameSite=Strict` } }
                    : undefined,
            );
        }

        await db.insert(userSessions).values({ id: sessionId, userId, origin, start: new Date().getTime() }).onConflictDoUpdate({
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

    app.get("/assets/*", (c) => {
        //TODO: disable for dev only (source map)
        const request = c.req.raw;
        if (!getSessionId(request) && new URL(request.url).hostname !== "127.0.0.1")
            return new Response(undefined, { status: 401 });
        return new Response(Bun.file(join("../frontend/dist/", c.req.path)));
    });
};
