import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

export * from "./schema.js";

/**
 * Create a Drizzle DB instance. Does NOT run migrations —
 * that's the server's responsibility.
 */
export function createDb(url: string) {
	const sqlite = new Database(url);
	return drizzle(sqlite, { schema });
}

export function createDbFromSqlite(sqlite: Database) {
	return drizzle(sqlite, { schema });
}
