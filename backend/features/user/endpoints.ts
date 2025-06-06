import { parties } from "db/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import type { RouteDeclaration } from "../../routing/types";
import { endpoint, getSessionId } from "../../routing/utils";
import { users, userSessions } from "./db";

export const routes: RouteDeclaration[] = [
    /*
    [
        endpoint("GET", "/portal"),
        async (req, _, server) => {
            const origin = server.requestIP(req)?.address;
            const sessionId = getSessionId(req);
            if (!sessionId || !origin) return Response.redirect("/");
            if (!(await User.getUserId(req))) return Response.redirect("/");

            return new Response(
                Bun.file("../frontend/dist/src/pages/portal/index.html")
            );
        },
    ],
    */

    [
        endpoint("POST", "/login"),
        async (req, _, server) => {
            const origin = server.requestIP(req)?.address;
            const sessionId = getSessionId(req);
            if (!sessionId || !origin)
                return new Response(undefined, { status: 400 });
            const formData = await req.formData();
            const username = formData.get("username");
            const password = formData.get("password");
            if (!username || !password)
                return new Response(undefined, { status: 400 });

            const res = await db.query.users.findFirst({
                where: eq(users.name, username as string),
                columns: { id: true, password: true },
            });
            if (
                !res?.password ||
                !(await Bun.password.verify(password as string, res.password))
            )
                return new Response(undefined, { status: 401 });

            await db
                .insert(userSessions)
                .values({
                    id: sessionId,
                    userId: res?.id!,
                    origin,
                    start: new Date().getTime(),
                })
                .onConflictDoUpdate({
                    target: userSessions.userId,
                    set: {
                        id: sessionId,
                        origin,
                        start: new Date().getTime(),
                    },
                });

            const defaultParty = await db.query.parties.findFirst({
                where: and(
                    eq(parties.active, true),
                    eq(parties.hostId, res.id),
                ),
                columns: { id: true },
            });

            let partyId = defaultParty?.id;
            if (!partyId) {
                partyId = crypto.randomUUID();
                await db.insert(parties).values({
                    id: partyId,
                    hostId: res.id,
                });
            }

            return new Response(partyId);
        },
    ],

    [
        endpoint("POST", "/logout"),
        async (req) => {
            const sessionId = getSessionId(req);
            if (!sessionId) return new Response(undefined, { status: 400 });

            await db.delete(userSessions).where(eq(userSessions.id, sessionId));
            return Response.redirect("/");
        },
    ],

    [
        //TODO: deprecate
        endpoint("POST", "/register"),
        async (req, _, server) => {
            const origin = server.requestIP(req)?.address;
            const sessionId = getSessionId(req);
            if (!sessionId || !origin)
                return new Response(undefined, { status: 400 });
            const formData = await req.formData();
            const username = formData.get("username");
            const password = formData.get("password");
            const hashedPassword = await Bun.password.hash(password as string);
            const insert = await db
                .insert(users)
                .values({
                    id: crypto.randomUUID(),
                    name: username as string,
                    password: hashedPassword,
                })
                .onConflictDoNothing()
                .returning();
            if (!insert[0]?.id) return new Response(undefined, { status: 400 });
            await db.insert(userSessions).values({
                id: sessionId,
                userId: insert[0].id,
                origin,
                start: new Date().getTime(),
            });
            return new Response();
        },
    ],
];
