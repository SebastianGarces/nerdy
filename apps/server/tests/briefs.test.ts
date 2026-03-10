import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { setupDatabaseFromSqlite } from "../src/db.js";
import { briefRoutes } from "../src/routes/briefs.js";

interface BriefsResponse {
	briefs: Array<{ audience: string; product: string }>;
}

function createTestApp() {
	const sqlite = new Database(":memory:");
	const db = setupDatabaseFromSqlite(sqlite);
	const app = new Elysia().use(briefRoutes(db));
	return { app, db, sqlite };
}

describe("briefs routes", () => {
	let app: ReturnType<typeof createTestApp>["app"];
	let sqlite: Database;

	beforeAll(() => {
		const test = createTestApp();
		app = test.app;
		sqlite = test.sqlite;
	});

	afterAll(() => {
		sqlite.close();
	});

	describe("GET /api/briefs", () => {
		it("should return empty briefs initially", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/briefs"),
			);
			const body = (await response.json()) as BriefsResponse;
			expect(response.status).toBe(200);
			expect(body).toHaveProperty("briefs");
			expect(body.briefs).toBeArray();
		});
	});

	describe("POST /api/briefs/generate", () => {
		it("should generate and store briefs", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/briefs/generate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ count: 3 }),
				}),
			);
			const body = (await response.json()) as BriefsResponse;
			expect(response.status).toBe(200);
			expect(body.briefs).toHaveLength(3);
			expect(body.briefs[0]).toHaveProperty("audience");
			expect(body.briefs[0]).toHaveProperty("product");
		});

		it("should persist generated briefs", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/briefs"),
			);
			const body = (await response.json()) as BriefsResponse;
			expect(body.briefs.length).toBeGreaterThanOrEqual(3);
		});
	});
});
