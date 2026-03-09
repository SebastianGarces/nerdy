import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

export function createDb(url: string) {
	const sqlite = new Database(url);
	return drizzle(sqlite);
}
