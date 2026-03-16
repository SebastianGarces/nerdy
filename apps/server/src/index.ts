import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { setupDatabase } from "./db.js";
import {
	adRoutes,
	analyticsRoutes,
	briefRoutes,
	campaignRoutes,
	competitorAdRoutes,
	evaluationRoutes,
	pipelineRoutes,
} from "./routes/index.js";

const port = process.env.PORT ?? process.env.SERVER_PORT ?? 3001;
const databaseUrl =
	process.env.DATABASE_URL ?? "/data/nerdy.sqlite";

// Ensure data directory exists
if (databaseUrl !== ":memory:") {
	mkdirSync(dirname(databaseUrl), { recursive: true });
}

const db = setupDatabase(databaseUrl);

const app = new Elysia()
	.use(cors())
	.get("/health", () => ({ status: "ok" }))
	.use(adRoutes(db))
	.use(analyticsRoutes(db))
	.use(briefRoutes(db))
	.use(evaluationRoutes(db))
	.use(pipelineRoutes(db))
	.use(campaignRoutes(db))
	.use(competitorAdRoutes(db))
	.get("/images/:file", ({ params }) => {
		const imagePath = resolve(import.meta.dir, "../data/images", params.file);
		const file = Bun.file(imagePath);
		return new Response(file, {
			headers: { "Content-Type": file.type || "image/png" },
		});
	})
	.listen(port);

console.log(`Server running at http://localhost:${port}`);

export type App = typeof app;
export { app };
