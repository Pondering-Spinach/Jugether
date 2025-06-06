import { relations } from "drizzle-orm";
import {
    integer,
    primaryKey,
    sqliteTable,
    text,
} from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("videos", {
    id: text().primaryKey(),
    url: text(),
    duration: integer(),
    channel: text(),
    channel_id: text(),
    channel_url: text(),
    title: text(),
    channel_is_verified: integer({ mode: "boolean" }),
});

export const cacheRelations = relations(videos, ({ many }) => ({
    thumbnails: many(thumbnails),
}));

export const thumbnails = sqliteTable(
    "thumbs",
    {
        video: text().references(() => videos.id),
        url: text(),
        height: integer(),
        width: integer(),
    },
    (table) => [primaryKey({ columns: [table.video, table.width] })],
);

export const thumbnailsRelations = relations(thumbnails, ({ one }) => ({
    video: one(videos, { fields: [thumbnails.video], references: [videos.id] }),
}));
