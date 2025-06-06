import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { parties } from "./db";

export async function userHostsParty(userId: string, partyId: string) {
    const res = await db.query.parties.findFirst({
        where: and(eq(parties.active, true), eq(parties.id, partyId)),
        columns: { hostId: true },
    });
    return res?.hostId === userId;
}
