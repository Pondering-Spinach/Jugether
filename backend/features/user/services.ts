import { eq } from "drizzle-orm";
import { db } from "../../db";
import { getSessionId } from "../../routing/utils";
import { guestSessions, userSessions } from "./db";

export const Guest = {
    getPartyId: async function (req: Request) {
        const sessionId = getSessionId(req);
        if (!sessionId) return null;
        const res = await db.query.guestSessions.findFirst({
            where: eq(guestSessions.id, sessionId),
            columns: { partyId: true },
        });
        return res?.partyId ?? null;
    },
};

export const User = {
    getUserId: async function (req: Request) {
        const sessionId = getSessionId(req);
        if (!sessionId) return null;
        const res = await db.query.userSessions.findFirst({
            where: eq(userSessions.id, sessionId),
            columns: { userId: true },
        });
        return res?.userId ?? null;
    },
};
