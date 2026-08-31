import { and, eq } from "drizzle-orm";
import type { App } from "../../routing/app";
import { db } from "../../db";
import { getSessionId } from "../../routing/utils";
import { guestSessions } from "../user/db";
import { User } from "../user/services";
import { parties } from "./db";
import { userHostsParty } from "./services";

export const registerPartyRoutes = (app: App) => {
    app.get("/host", async (c) => {
        //TODO: validate host origin against session
        const partyId = c.req.query("id");
        if (!partyId) return c.redirect("/");
        //TODO: check footprint against previous host => redirect to portal / login
        // https://www.npmjs.com/package/@fingerprintjs/fingerprintjs
        const userId = await User.getUserId(c.req.raw);
        if (!userId) return c.redirect("/party?id=" + partyId);
        if (!(await userHostsParty(userId, partyId))) return c.redirect("/portal");

        return new Response(Bun.file("../frontend/dist/src/pages/host/index.html"));
    });

    app.delete("/party", async (c) => {
        //TODO: validate host origin against session
        const partyId = c.req.query("id");
        if (!partyId) return new Response(undefined, { status: 400 });
        const userId = await User.getUserId(c.req.raw);
        if (!userId || !(await userHostsParty(userId, partyId)))
            return new Response(undefined, { status: 400 });

        await db.update(parties).set({ active: false }).where(eq(parties.id, partyId));
        const newPartyId = crypto.randomUUID();
        await db.insert(parties).values({ id: newPartyId, hostId: userId });
        return new Response(newPartyId);
    });

    app.get("/party", async (c) => {
        //TODO: forward hosts (don't serve party to hosts)
        const partyId = c.req.query("id");
        if (!partyId)
            return new Response(Bun.file("../frontend/dist/src/pages/public/index.html"));

        const existingSessionId = getSessionId(c.req.raw);
        const sessionId = existingSessionId || crypto.randomUUID();
        if (!(await db.query.parties.findFirst({
            where: and(eq(parties.active, true), eq(parties.id, partyId)),
            columns: { id: true },
        })))
            return new Response(undefined, { status: 400 });

        await db.insert(guestSessions).values({ id: sessionId, partyId }).onConflictDoUpdate({
            target: guestSessions.id,
            set: { partyId },
        });
        return new Response(
            Bun.file("../frontend/dist/src/pages/guest/index.html"),
            existingSessionId ? undefined : { headers: { "Set-Cookie": `sessionId=${sessionId}; SameSite=Strict` } },
        );
    });

    app.get("/parties", async (c) => {
        const userId = await User.getUserId(c.req.raw);
        if (!userId) return new Response(undefined, { status: 401 });
        const userParties = await db.query.parties.findMany({
            where: eq(parties.hostId, userId),
            columns: { id: true, begins: true, ends: true },
        });
        return new Response(JSON.stringify(userParties));
    });
};
