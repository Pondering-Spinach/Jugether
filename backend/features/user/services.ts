import { and, eq } from "drizzle-orm";
import { auth } from "../../auth";
import { db } from "../../db";
import { getSessionId } from "../../routing/utils";
import { parties } from "../party/db";
import { guestSessions } from "./db";

export const Guest = {
    getPartyId: async function (req: Request) {
        const sessionId = getSessionId(req);
        if (!sessionId) return null;
        const session = await db
            .select({ partyId: guestSessions.partyId })
            .from(guestSessions)
            .innerJoin(parties, eq(guestSessions.partyId, parties.id))
            .where(
                and(eq(guestSessions.id, sessionId), eq(parties.active, true)),
            )
            .get();
        return session?.partyId ?? null;
    },
};

export const User = {
    getUserId: async function (req: Request) {
        const session = await auth.api.getSession({ headers: req.headers });
        return session?.user.id ?? null;
    },
};
