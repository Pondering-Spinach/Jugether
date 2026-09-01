import { relations } from "drizzle-orm";
import {
    integer,
    primaryKey,
    sqliteTable,
    text,
} from "drizzle-orm/sqlite-core";
import { parties } from "../party/db";
import { videos } from "../ytdlp/db";

export const queues = sqliteTable("queues", {
    id: integer().primaryKey({ autoIncrement: true }),
    partyId: text()
        .notNull()
        .references(() => parties.id),
    videoId: text()
        .notNull()
        .references(() => videos.id),
    queuedAt: integer().notNull(),
    playedAt: integer(),
    skippedAt: integer(),
    startedAt: integer(),
});

export const queuesRlations = relations(queues, ({ one, many }) => ({
    votes: many(votes),
    video: one(videos, { fields: [queues.videoId], references: [videos.id] }),
}));

export const votes = sqliteTable(
    "votes",
    {
        sessionId: text().notNull(),
        queueEntry: integer()
            .notNull()
            .references(() => queues.id),
        positive: integer({ mode: "boolean" }).notNull(),
    },
    (table) => [primaryKey({ columns: [table.sessionId, table.queueEntry] })],
);

export const votesRelations = relations(votes, ({ one }) => ({
    queueEntry: one(queues, {
        fields: [votes.queueEntry],
        references: [queues.id],
    }),
}));
