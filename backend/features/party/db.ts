import { sql } from "drizzle-orm";
import {
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

// A server has one active party. Inactive rows retain old party history.
export const parties = sqliteTable(
    "parties",
    {
        id: text().primaryKey(),
        active: integer({ mode: "boolean" }).notNull().default(true),
    },
    (table) => [
        uniqueIndex("parties_one_active")
            .on(table.active)
            .where(sql`${table.active} = 1`),
    ],
);
