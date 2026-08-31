import { parties } from "db/schema";
import { and, eq } from "drizzle-orm";
import type { App } from "../../routing/app";
import { db } from "../../db";
import { getSessionId } from "../../routing/utils";
import { users, userSessions } from "./db";
import { hashPassword, verifyPassword } from "./password";

export const registerUserRoutes = (app: App) => {
    app.post("/login", async (c) => {
        const request = c.req.raw;
        const origin = c.env.clientIp;
        const sessionId = getSessionId(request);
        if (!sessionId || !origin) return new Response(undefined, { status: 400 });
        const formData = await request.formData();
        const username = formData.get("username");
        const password = formData.get("password");
        if (!username || !password) return new Response(undefined, { status: 400 });

        const res = await db.query.users.findFirst({
            where: eq(users.name, username as string),
            columns: { id: true, password: true },
        });
        if (!res?.password || !(await verifyPassword(password as string, res.password)))
            return new Response(undefined, { status: 401 });

        await db.insert(userSessions).values({
            id: sessionId,
            userId: res.id,
            origin,
            start: new Date().getTime(),
        }).onConflictDoUpdate({
            target: userSessions.userId,
            set: { id: sessionId, origin, start: new Date().getTime() },
        });
        const defaultParty = await db.query.parties.findFirst({
            where: and(eq(parties.active, true), eq(parties.hostId, res.id)),
            columns: { id: true },
        });
        let partyId = defaultParty?.id;
        if (!partyId) {
            partyId = crypto.randomUUID();
            await db.insert(parties).values({ id: partyId, hostId: res.id });
        }
        return new Response(partyId);
    });

    app.post("/logout", async (c) => {
        const sessionId = getSessionId(c.req.raw);
        if (!sessionId) return new Response(undefined, { status: 400 });
        await db.delete(userSessions).where(eq(userSessions.id, sessionId));
        return c.redirect("/");
    });

    //TODO: deprecate
    app.post("/register", async (c) => {
        const request = c.req.raw;
        const origin = c.env.clientIp;
        const sessionId = getSessionId(request);
        if (!sessionId || !origin) return new Response(undefined, { status: 400 });
        const formData = await request.formData();
        const username = formData.get("username");
        const password = formData.get("password");
        const hashedPassword = await hashPassword(password as string);
        const insert = await db.insert(users).values({
            id: crypto.randomUUID(),
            name: username as string,
            password: hashedPassword,
        }).onConflictDoNothing().returning();
        if (!insert[0]?.id) return new Response(undefined, { status: 400 });
        await db.insert(userSessions).values({
            id: sessionId,
            userId: insert[0].id,
            origin,
            start: new Date().getTime(),
        });
        return new Response();
    });
};
