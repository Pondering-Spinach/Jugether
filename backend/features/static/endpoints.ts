import { parties, userSessions } from "db/schema";
import { and, eq } from "drizzle-orm";
import { User } from "features/user/services";
import { join } from "path";
import { db } from "../../db";
import type { RouteDeclaration } from "../../routing/types";
import { endpoint, getSessionId } from "../../routing/utils";

export const routes: RouteDeclaration[] = [
    [
        endpoint("GET", "/"),
        async (req, _, server) => {
            const sessionId = getSessionId(req);
            const userId = await User.getUserId(req);
            const origin = server.requestIP(req)?.address;
            if (!sessionId || !userId || !origin) {
                return new Response(
                    Bun.file("../frontend/dist/src/pages/public/index.html"),
                    !getSessionId(req)
                        ? {
                              headers: {
                                  "Set-Cookie": `sessionId=${crypto.randomUUID()}; SameSite=Strict`,
                              },
                          }
                        : undefined,
                );
            }

            await db
                .insert(userSessions)
                .values({
                    id: sessionId,
                    userId: userId,
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
                    eq(parties.hostId, userId),
                ),
                columns: { id: true },
            });

            let partyId = defaultParty?.id;
            if (!partyId) {
                partyId = crypto.randomUUID();
                await db.insert(parties).values({
                    id: partyId,
                    hostId: userId,
                });
            }

            return Response.redirect("/host?id=" + partyId);
        },
    ],

    [
        (url, method) => method === "GET" && url.pathname.startsWith("/assets"),
        (req, url) => {
            //TODO: disable for dev only (source map)
            if (!getSessionId(req) && url.hostname !== "127.0.0.1")
                return new Response(undefined, { status: 401 });
            return new Response(
                Bun.file(join("../frontend/dist/", url.pathname)),
            );
        },
    ],
];
