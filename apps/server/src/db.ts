import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { createDbFromSqlite } from "@nerdy/pipeline";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../drizzle");

export function setupDatabase(url: string) {
	const sqlite = new Database(url);
	const db = createDbFromSqlite(sqlite);
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return db;
}

export function setupDatabaseFromSqlite(sqlite: Database) {
	const db = createDbFromSqlite(sqlite);
	migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return db;
}

export type AppDatabase = ReturnType<typeof setupDatabase>;
