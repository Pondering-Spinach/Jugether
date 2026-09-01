import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { parties } from "../party/db";

// Anonymous party participation is application state, not an auth session.
export const guestSessions = sqliteTable("guestSessions", {
    id: text().notNull().primaryKey(),
    partyId: text()
        .notNull()
        .references(() => parties.id),
});
