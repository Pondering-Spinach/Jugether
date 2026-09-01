import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("videos", {
    id: text().primaryKey(),
    artist: text().notNull(),
    song: text().notNull(),
});
