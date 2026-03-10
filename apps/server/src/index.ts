import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { setupDatabase } from "./db.js";
import {
	adRoutes,
	briefRoutes,
	evaluationRoutes,
	pipelineRoutes,
} from "./routes/index.js";

const port = process.env.SERVER_PORT ?? 3001;
const databaseUrl = process.env.DATABASE_URL ?? "./data/nerdy.sqlite";

// Ensure data directory exists
if (databaseUrl !== ":memory:" && !databaseUrl.startsWith("file:")) {
	mkdirSync(dirname(databaseUrl), { recursive: true });
}

const db = setupDatabase(databaseUrl);

const app = new Elysia()
	.use(cors())
	.get("/health", () => ({ status: "ok" }))
	.use(adRoutes(db))
	.use(briefRoutes(db))
	.use(evaluationRoutes(db))
	.use(pipelineRoutes())
	.listen(port);

console.log(`Server running at http://localhost:${port}`);

export type App = typeof app;
export { app };
