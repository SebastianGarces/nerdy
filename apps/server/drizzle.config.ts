import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// DATABASE_URL defaults to ./data/nerdy.sqlite relative to apps/server/
const rawUrl = process.env.DATABASE_URL ?? "./data/nerdy.sqlite";
const dbPath = rawUrl.replace(/^file:/, "");

export default defineConfig({
	dialect: "sqlite",
	schema: "../../packages/pipeline/src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: resolve(__dirname, dbPath),
	},
});
