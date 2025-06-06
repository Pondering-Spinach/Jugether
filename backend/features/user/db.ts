import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { parties } from "../party/db";

export const users = sqliteTable("users", {
    id: text().notNull().primaryKey(),
    name: text().notNull().unique(),
    password: text().notNull(),
});

export const userSessions = sqliteTable("userSessions", {
    id: text().notNull().primaryKey(),
    userId: text()
        .notNull()
        .unique()
        .references(() => users.id),
    origin: text().notNull(),
    start: integer().notNull(),
});

export const guestSessions = sqliteTable("guestSessions", {
    id: text().notNull().primaryKey(),
    partyId: text()
        .notNull()
        .references(() => parties.id),
});
