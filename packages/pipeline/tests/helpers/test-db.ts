import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../../src/db/schema.js";

const MIGRATIONS_FOLDER = resolve(
	import.meta.dir,
	"../../../../apps/server/drizzle",
);

export function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON;");
	const db = drizzle(sqlite, { schema });
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return { db, sqlite };
}
