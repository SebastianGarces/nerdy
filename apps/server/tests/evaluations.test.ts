import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { setupDatabaseFromSqlite } from "../src/db.js";
import { evaluationRoutes } from "../src/routes/evaluations.js";

interface TrendsResponse {
	trends: Array<{ date: string; avgScore: number; count: number }>;
}

interface StatsResponse {
	passRate: number;
	avgIterations: number;
	avgScore: number;
	totalAds: number;
	totalCost: number;
}

function createTestApp() {
	const sqlite = new Database(":memory:");
	const db = setupDatabaseFromSqlite(sqlite);
	const app = new Elysia().use(evaluationRoutes(db));
	return { app, db, sqlite };
}

function seedTestData(sqlite: Database) {
	sqlite.exec(`
		INSERT INTO ad_briefs (id, audience, product, campaign_goal, emotional_angle, hook_style, body_pattern, offer_type, brand_voice, created_at)
		VALUES ('brief-1', 'parent', 'Varsity Tutors', 'conversion', 'aspiration', 'question', 'problem-agitate-solution', 'Free consultation', '["empowering"]', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-1', 'brief-1', 'Primary text 1', 'Headline 1', 'Description 1', 'CTA 1', 'gpt-4', 100, 50, 500, 1, 'published', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-2', 'brief-1', 'Primary text 2', 'Headline 2', 'Description 2', 'CTA 2', 'gpt-4', 100, 50, 500, 2, 'draft', '2026-01-02T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, created_at)
		VALUES ('eval-1', 'ad-1', '[{"dimension":"clarity","score":8,"rationale":"Clear"}]', 0.8, 0.9, 'gpt-4', 200, '2026-01-01T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, created_at)
		VALUES ('eval-2', 'ad-2', '[{"dimension":"clarity","score":6,"rationale":"OK"}]', 0.6, 0.85, 'gpt-4', 200, '2026-01-02T00:00:00Z');

		INSERT INTO iteration_logs (id, brief_id, iteration, ad_id, evaluation_id, weakest_dimension, action, score_before, score_after, created_at)
		VALUES ('log-1', 'brief-1', 1, 'ad-1', 'eval-1', 'clarity', 'regenerate', 0.5, 0.8, '2026-01-01T00:00:00Z');

		INSERT INTO token_usage (id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at)
		VALUES ('tok-1', 'generate', 'gpt-4', 100, 50, 150, 0.005, '2026-01-01T00:00:00Z');

		INSERT INTO token_usage (id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at)
		VALUES ('tok-2', 'evaluate', 'gpt-4', 200, 100, 300, 0.01, '2026-01-02T00:00:00Z');
	`);
}

describe("evaluations routes", () => {
	let app: ReturnType<typeof createTestApp>["app"];
	let sqlite: Database;

	beforeAll(() => {
		const test = createTestApp();
		app = test.app;
		sqlite = test.sqlite;
		seedTestData(sqlite);
	});

	afterAll(() => {
		sqlite.close();
	});

	describe("GET /api/evaluations/trends", () => {
		it("should return trends grouped by date", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/evaluations/trends"),
			);
			const body = (await response.json()) as TrendsResponse;
			expect(response.status).toBe(200);
			expect(body).toHaveProperty("trends");
			expect(body.trends).toBeArray();
			expect(body.trends.length).toBeGreaterThan(0);
			expect(body.trends[0]).toHaveProperty("date");
			expect(body.trends[0]).toHaveProperty("avgScore");
			expect(body.trends[0]).toHaveProperty("count");
		});
	});

	describe("GET /api/evaluations/stats", () => {
		it("should return aggregate statistics", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/evaluations/stats"),
			);
			const body = (await response.json()) as StatsResponse;
			expect(response.status).toBe(200);
			expect(body).toHaveProperty("passRate");
			expect(body).toHaveProperty("avgIterations");
			expect(body).toHaveProperty("avgScore");
			expect(body).toHaveProperty("totalAds");
			expect(body).toHaveProperty("totalCost");
			expect(body.totalAds).toBe(2);
			expect(body.passRate).toBe(0.5);
			expect(body.totalCost).toBe(0.015);
		});
	});
});
