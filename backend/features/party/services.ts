import { eq } from "drizzle-orm";
import { db } from "../../db";
import { parties } from "./db";

export async function getActivePartyId() {
    const party = await db.query.parties.findFirst({
        where: eq(parties.active, true),
        columns: { id: true },
    });
    return party?.id ?? null;
}
