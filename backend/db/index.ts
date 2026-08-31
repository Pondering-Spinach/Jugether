import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// SQLite must reside on local persistent storage. Keep this default compatible
// with the existing development database while allowing deployments to set a path.
const client = new Database(process.env["DATABASE_PATH"] ?? "test.db");
client.pragma("foreign_keys = ON");
client.pragma("journal_mode = WAL");
client.pragma("busy_timeout = 5000");

export const db = drizzle(client, { schema });
