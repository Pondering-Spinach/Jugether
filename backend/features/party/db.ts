import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "../user/db";

export const parties = sqliteTable("parties", {
    id: text().primaryKey(),
    active: integer({ mode: "boolean" }).default(true),
    hostId: text().references(() => users.id),
    begins: integer(),
    ends: integer(),
});
