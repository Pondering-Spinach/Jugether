import { serveStatic } from "@hono/node-server/serve-static";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { frontendDist } from "../../routing/static";
import { getSessionId } from "../../routing/utils";
import { streamControllers } from "../queue/state";
import { guestSessions } from "../user/db";
import { requireHost } from "./access";
import { parties } from "./db";
import { getActivePartyId } from "./services";

const hostPage = serveStatic({ root: frontendDist, path: "host.html" });
const guestPage = serveStatic({ root: frontendDist, path: "guest.html" });
const publicPage = serveStatic({ root: frontendDist, path: "index.html" });

export const registerPartyRoutes = (app: App) => {
    app.get("/host", async (c) => {
        const requestedPartyId = c.req.query("id");
        const partyId = await getActivePartyId();
        if (!(await requireHost(c.req.raw)))
            return requestedPartyId
                ? c.redirect("/party?id=" + requestedPartyId)
                : c.redirect("/");
        if (!partyId) return c.redirect("/");
        if (requestedPartyId !== partyId)
            return c.redirect("/host?id=" + partyId);
        return hostPage(c, async () => undefined);
    });

    app.delete("/party", async (c) => {
        if (!(await requireHost(c.req.raw)))
            return new Response(undefined, { status: 401 });
        const partyId = await getActivePartyId();
        if (!partyId) return new Response(undefined, { status: 400 });
        await db
            .update(parties)
            .set({ active: false })
            .where(eq(parties.id, partyId));
        for (const controller of streamControllers) controller.close();
        streamControllers.clear();
        const newPartyId = crypto.randomUUID();
        await db.insert(parties).values({ id: newPartyId });
        return new Response(newPartyId);
    });

    app.get("/party", async (c) => {
        const partyId = c.req.query("id");
        if (!partyId) return publicPage(c, async () => undefined);
        if ((await getActivePartyId()) !== partyId)
            return new Response(undefined, { status: 400 });
        const existingSessionId = getSessionId(c.req.raw);
        const sessionId = existingSessionId || crypto.randomUUID();
        await db
            .insert(guestSessions)
            .values({ id: sessionId, partyId })
            .onConflictDoUpdate({ target: guestSessions.id, set: { partyId } });
        if (!existingSessionId)
            c.header(
                "Set-Cookie",
                `sessionId=${sessionId}; HttpOnly; SameSite=Strict; Path=/`,
            );
        return guestPage(c, async () => undefined);
    });
};
