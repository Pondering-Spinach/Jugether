import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { parties } from "../party/db";

// Better Auth owns account users and authenticated sessions. Keep this alias so
// application tables can retain their existing user foreign-key imports.
export { user as users } from "../../db/auth-schema";

// Anonymous party participation is application state, not an auth session.
export const guestSessions = sqliteTable("guestSessions", {
    id: text().notNull().primaryKey(),
    partyId: text()
        .notNull()
        .references(() => parties.id),
});
