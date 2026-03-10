import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

export * from "./schema.js";

export function createDb(url: string) {
	const sqlite = new Database(url);
	return drizzle(sqlite, { schema });
}
