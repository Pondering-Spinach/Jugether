import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import type { RouteDeclaration } from "../../routing/types";
import { endpoint, getSessionId } from "../../routing/utils";
import { guestSessions } from "../user/db";
import { User } from "../user/services";
import { parties } from "./db";
import { userHostsParty } from "./services";

export const routes: RouteDeclaration[] = [
    [
        endpoint("GET", "/host"),
        async (req, url) => {
            //TODO: validate host origin against session
            const partyId = url.searchParams.get("id");
            if (!partyId) return Response.redirect("/");
            //TODO: check footprint against previous host => redirect to portal / login
            // https://www.npmjs.com/package/@fingerprintjs/fingerprintjs
            const userId = await User.getUserId(req);
            if (!userId) return Response.redirect("/party?id=" + partyId);
            if (!(await userHostsParty(userId, partyId)))
                return Response.redirect("/portal");

            return new Response(
                Bun.file("../frontend/dist/src/pages/host/index.html"),
            );
        },
    ],

    [
        endpoint("DELETE", "/party"),
        async (req, url) => {
            //TODO: validate host origin against session
            const partyId = url.searchParams.get("id");
            if (!partyId) return new Response(undefined, { status: 400 });
            const userId = await User.getUserId(req);
            if (!userId) return new Response(undefined, { status: 400 });
            if (!(await userHostsParty(userId, partyId)))
                return new Response(undefined, { status: 400 });

            await db
                .update(parties)
                .set({ active: false })
                .where(eq(parties.id, partyId));

            const newPartyId = crypto.randomUUID();
            await db.insert(parties).values({
                id: newPartyId,
                hostId: userId,
            });

            return new Response(newPartyId);
        },
    ],

    [
        endpoint("GET", "/party"),
        async (req, url) => {
            //TODO: forward hosts (don't serve party to hosts)
            const partyId = url.searchParams.get("id");
            if (!partyId)
                return new Response(
                    Bun.file("../frontend/dist/src/pages/public/index.html"),
                );

            const existingSessionId = getSessionId(req);
            const sessionId = existingSessionId || crypto.randomUUID();
            if (
                !(await db.query.parties.findFirst({
                    where: and(
                        eq(parties.active, true),
                        eq(parties.id, partyId),
                    ),
                    columns: { id: true },
                }))
            )
                return new Response(undefined, { status: 400 });
            else {
                await db
                    .insert(guestSessions)
                    .values({ id: sessionId, partyId })
                    .onConflictDoUpdate({
                        target: guestSessions.id,
                        set: { partyId },
                    });
            }
            return new Response(
                Bun.file("../frontend/dist/src/pages/guest/index.html"),
                existingSessionId
                    ? undefined
                    : {
                          headers: {
                              "Set-Cookie": `sessionId=${sessionId}; SameSite=Strict`,
                          },
                      },
            );
        },
    ],

    [
        endpoint("GET", "/parties"),
        async (req) => {
            const userId = await User.getUserId(req);
            if (!userId) return new Response(undefined, { status: 401 });

            const userParties = await db.query.parties.findMany({
                where: eq(parties.hostId, userId),
                columns: { id: true, begins: true, ends: true },
            });
            return new Response(JSON.stringify(userParties));
        },
    ],

    /*
    [
        endpoint("POST", "/party"),
        async (req) => {
            const userId = await User.getUserId(req);
            if (!userId) return new Response(undefined, { status: 401 });

            const formData = await req.formData();
            const start = formData.get("start");
            const duration = formData.get("duration");

            if (!start || !duration) {
                return new Response(undefined, { status: 400 });
            }

            const partyId = crypto.randomUUID();
            await db.insert(parties).values({
                id: partyId,
                hostId: userId,
                begins: +start,
                ends: +start + +duration * 24 * 60 * 60 * 1_000,
            });

            return new Response(partyId);
        },
    ],
    */
];
