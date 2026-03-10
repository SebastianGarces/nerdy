import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DATABASE_URL ?? "./apps/server/data/nerdy.sqlite";

export default defineConfig({
	dialect: "sqlite",
	schema: "../../packages/pipeline/src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: resolve(dbPath),
	},
});
