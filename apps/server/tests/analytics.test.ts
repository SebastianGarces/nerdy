import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { setupDatabaseFromSqlite } from "../src/db.js";
import { analyticsRoutes } from "../src/routes/analytics.js";

interface SummaryResponse {
	totalAds: number;
	publishedAds: number;
	totalTokens: number;
	totalCost: number;
	avgPublishedScore: number;
	costPerAd: number;
	costPerPassingAd: number;
	qualityPerDollar: number;
	avgLatencyMs: number;
}

interface CostOverTimeEntry {
	date: string;
	dailyCost: number;
	dailyTokens: number;
	operationCount: number;
}

interface CostByOperationEntry {
	operation: string;
	totalCost: number;
	totalTokens: number;
	count: number;
}

interface EfficiencyEntry {
	date: string;
	dailyCost: number;
	avgScore: number;
	costPerQualityPoint: number;
}

interface IterationCostResponse {
	iterations: Array<{ iteration: number; adCount: number }>;
	costByOperation: Array<{ operation: string; avgCost: number }>;
}

function createTestApp() {
	const sqlite = new Database(":memory:");
	const db = setupDatabaseFromSqlite(sqlite);
	const app = new Elysia().use(analyticsRoutes(db));
	return { app, db, sqlite };
}

function seedTestData(sqlite: Database) {
	sqlite.exec(`
		INSERT INTO ad_briefs (id, audience, product, campaign_goal, emotional_angle, hook_style, body_pattern, offer_type, brand_voice, created_at)
		VALUES ('brief-1', 'parent', 'Varsity Tutors', 'conversion', 'aspiration', 'question', 'problem-agitate-solution', 'Free consultation', '["empowering"]', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-1', 'brief-1', 'Primary text 1', 'Headline 1', 'Description 1', 'CTA 1', 'gpt-4', 100, 50, 500, 1, 'approved', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-2', 'brief-1', 'Primary text 2', 'Headline 2', 'Description 2', 'CTA 2', 'gpt-4', 100, 50, 500, 1, 'approved', '2026-01-02T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-3', 'brief-1', 'Primary text 3', 'Headline 3', 'Description 3', 'CTA 3', 'gpt-4', 100, 50, 500, 2, 'generating', '2026-01-02T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, latency_ms, created_at)
		VALUES ('eval-1', 'ad-1', '[{"dimension":"clarity","score":8,"rationale":"Clear"}]', 8.0, 0.9, 'gpt-4', 200, 300, '2026-01-01T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, latency_ms, created_at)
		VALUES ('eval-2', 'ad-2', '[{"dimension":"clarity","score":7,"rationale":"OK"}]', 7.0, 0.85, 'gpt-4', 200, 400, '2026-01-02T00:00:00Z');

		INSERT INTO token_usage (id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at)
		VALUES ('tok-1', 'generate', 'gpt-4', 100, 50, 150, 0.005, '2026-01-01T00:00:00Z');

		INSERT INTO token_usage (id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at)
		VALUES ('tok-2', 'generate', 'gpt-4', 120, 60, 180, 0.006, '2026-01-02T00:00:00Z');

		INSERT INTO token_usage (id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at)
		VALUES ('tok-3', 'evaluate', 'gpt-4', 200, 100, 300, 0.010, '2026-01-01T00:00:00Z');

		INSERT INTO token_usage (id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at)
		VALUES ('tok-4', 'regenerate', 'gpt-4', 150, 80, 230, 0.007, '2026-01-02T00:00:00Z');
	`);
}

// Total cost = 0.005 + 0.006 + 0.010 + 0.007 = 0.028
// Total tokens = 150 + 180 + 300 + 230 = 860
// Total ads = 3, published = 2
// Avg published score = (8.0 + 7.0) / 2 = 7.5

describe("analytics routes", () => {
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

	describe("GET /api/analytics/summary", () => {
		it("should return aggregate summary metrics", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/summary"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as SummaryResponse;
			expect(body.totalAds).toBe(3);
			expect(body.publishedAds).toBe(2);
			expect(body.totalTokens).toBe(860);
			expect(body.totalCost).toBeCloseTo(0.028, 5);
			expect(body.avgPublishedScore).toBeCloseTo(7.5, 5);
			expect(body.costPerAd).toBeCloseTo(0.028 / 3, 5);
			expect(body.costPerPassingAd).toBeCloseTo(0.028 / 2, 5);
			expect(body.qualityPerDollar).toBeCloseTo(7.5 / 0.028, 2);
			// avg latency: (500 + 500 + 500) / 3 = 500
			expect(body.avgLatencyMs).toBe(500);
		});
	});

	describe("GET /api/analytics/cost-over-time", () => {
		it("should return daily cost breakdown ordered by date", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/cost-over-time"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as CostOverTimeEntry[];
			expect(body).toBeArray();
			expect(body.length).toBe(2);

			// Day 1: tok-1 (0.005, 150) + tok-3 (0.010, 300) = 0.015, 450, count 2
			expect(body[0]?.date).toBe("2026-01-01");
			expect(body[0]?.dailyCost).toBeCloseTo(0.015, 5);
			expect(body[0]?.dailyTokens).toBe(450);
			expect(body[0]?.operationCount).toBe(2);

			// Day 2: tok-2 (0.006, 180) + tok-4 (0.007, 230) = 0.013, 410, count 2
			expect(body[1]?.date).toBe("2026-01-02");
			expect(body[1]?.dailyCost).toBeCloseTo(0.013, 5);
			expect(body[1]?.dailyTokens).toBe(410);
			expect(body[1]?.operationCount).toBe(2);
		});
	});

	describe("GET /api/analytics/cost-by-operation", () => {
		it("should return costs grouped by operation, ordered by cost desc", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/cost-by-operation"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as CostByOperationEntry[];
			expect(body).toBeArray();
			expect(body.length).toBe(3);

			// generate: 0.005 + 0.006 = 0.011, 150+180=330, count 2
			// evaluate: 0.010, 300, count 1
			// regenerate: 0.007, 230, count 1
			// Order by cost desc: generate (0.011), evaluate (0.010), regenerate (0.007)
			expect(body[0]?.operation).toBe("generate");
			expect(body[0]?.totalCost).toBeCloseTo(0.011, 5);
			expect(body[0]?.totalTokens).toBe(330);
			expect(body[0]?.count).toBe(2);

			expect(body[1]?.operation).toBe("evaluate");
			expect(body[1]?.totalCost).toBeCloseTo(0.01, 5);
			expect(body[1]?.totalTokens).toBe(300);
			expect(body[1]?.count).toBe(1);

			expect(body[2]?.operation).toBe("regenerate");
			expect(body[2]?.totalCost).toBeCloseTo(0.007, 5);
			expect(body[2]?.totalTokens).toBe(230);
			expect(body[2]?.count).toBe(1);
		});
	});

	describe("GET /api/analytics/efficiency-over-time", () => {
		it("should return daily cost and score efficiency", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/efficiency-over-time"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as EfficiencyEntry[];
			expect(body).toBeArray();
			expect(body.length).toBe(2);

			// Day 1: cost 0.015, avg score 8.0, costPerQualityPoint = 0.015/8.0
			expect(body[0]?.date).toBe("2026-01-01");
			expect(body[0]?.dailyCost).toBeCloseTo(0.015, 5);
			expect(body[0]?.avgScore).toBeCloseTo(8.0, 5);
			expect(body[0]?.costPerQualityPoint).toBeCloseTo(0.015 / 8.0, 5);

			// Day 2: cost 0.013, avg score 7.0, costPerQualityPoint = 0.013/7.0
			expect(body[1]?.date).toBe("2026-01-02");
			expect(body[1]?.dailyCost).toBeCloseTo(0.013, 5);
			expect(body[1]?.avgScore).toBeCloseTo(7.0, 5);
			expect(body[1]?.costPerQualityPoint).toBeCloseTo(0.013 / 7.0, 5);
		});
	});

	describe("GET /api/analytics/iteration-cost", () => {
		it("should return iteration counts and cost by operation", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/iteration-cost"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as IterationCostResponse;

			expect(body.iterations).toBeArray();
			expect(body.iterations.length).toBe(2);
			// iteration 1: ad-1, ad-2 = 2 ads
			expect(body.iterations[0]?.iteration).toBe(1);
			expect(body.iterations[0]?.adCount).toBe(2);
			// iteration 2: ad-3 = 1 ad
			expect(body.iterations[1]?.iteration).toBe(2);
			expect(body.iterations[1]?.adCount).toBe(1);

			expect(body.costByOperation).toBeArray();
			expect(body.costByOperation.length).toBeGreaterThan(0);
			// Each entry has operation and avgCost
			for (const entry of body.costByOperation) {
				expect(entry).toHaveProperty("operation");
				expect(entry).toHaveProperty("avgCost");
			}
		});
	});

	describe("GET /api/analytics/latency-summary", () => {
		it("should return latency statistics for generation, evaluation, and e2e", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/latency-summary"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as {
				generation: {
					avg: number;
					p50: number;
					p95: number;
					count: number;
				};
				evaluation: {
					avg: number;
					p50: number;
					p95: number;
					count: number;
				};
				endToEnd: { avg: number; p50: number; p95: number; count: number };
			};

			// Generation: 3 ads, all 500ms
			expect(body.generation.count).toBe(3);
			expect(body.generation.avg).toBe(500);
			expect(body.generation.p50).toBe(500);

			// Evaluation: 2 evals with latency_ms 300, 400 (both > 0)
			expect(body.evaluation.count).toBe(2);
			expect(body.evaluation.avg).toBe(350);

			// End-to-end: grouped by briefId (all same brief)
			// brief-1: sum(gen latency) = 1500, sum(eval latency) = 700, total = 2200
			expect(body.endToEnd.count).toBe(1);
			expect(body.endToEnd.avg).toBe(2200);
		});
	});

	describe("GET /api/analytics/latency-over-time", () => {
		it("should return daily latency averages", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/analytics/latency-over-time"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as Array<{
				date: string;
				avgGenerationMs: number;
				avgEvaluationMs: number;
				adCount: number;
			}>;
			expect(body).toBeArray();
			expect(body.length).toBe(2);

			// Day 1: ad-1 (500ms gen), eval-1 (300ms eval), 1 ad
			expect(body[0]?.date).toBe("2026-01-01");
			expect(body[0]?.avgGenerationMs).toBe(500);
			expect(body[0]?.avgEvaluationMs).toBe(300);
			expect(body[0]?.adCount).toBe(1);

			// Day 2: ad-2 (500ms gen, eval-2 400ms), ad-3 (500ms gen, no eval)
			expect(body[1]?.date).toBe("2026-01-02");
			expect(body[1]?.avgGenerationMs).toBe(500);
			expect(body[1]?.adCount).toBe(2);
		});
	});
});

describe("analytics routes - empty database", () => {
	let app: ReturnType<typeof createTestApp>["app"];
	let sqlite: Database;

	beforeAll(() => {
		const test = createTestApp();
		app = test.app;
		sqlite = test.sqlite;
		// No seed data — empty DB
	});

	afterAll(() => {
		sqlite.close();
	});

	it("GET /api/analytics/summary should return zeroes including avgLatencyMs", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/summary"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as SummaryResponse;
		expect(body.totalAds).toBe(0);
		expect(body.publishedAds).toBe(0);
		expect(body.totalTokens).toBe(0);
		expect(body.totalCost).toBe(0);
		expect(body.avgPublishedScore).toBe(0);
		expect(body.costPerAd).toBe(0);
		expect(body.costPerPassingAd).toBe(0);
		expect(body.qualityPerDollar).toBe(0);
		expect(body.avgLatencyMs).toBe(0);
	});

	it("GET /api/analytics/cost-over-time should return empty array", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/cost-over-time"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as CostOverTimeEntry[];
		expect(body).toBeArray();
		expect(body.length).toBe(0);
	});

	it("GET /api/analytics/cost-by-operation should return empty array", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/cost-by-operation"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as CostByOperationEntry[];
		expect(body).toBeArray();
		expect(body.length).toBe(0);
	});

	it("GET /api/analytics/efficiency-over-time should return empty array", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/efficiency-over-time"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as EfficiencyEntry[];
		expect(body).toBeArray();
		expect(body.length).toBe(0);
	});

	it("GET /api/analytics/iteration-cost should return empty data", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/iteration-cost"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as IterationCostResponse;
		expect(body.iterations).toBeArray();
		expect(body.iterations.length).toBe(0);
		expect(body.costByOperation).toBeArray();
		expect(body.costByOperation.length).toBe(0);
	});

	it("GET /api/analytics/latency-summary should return zeroes", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/latency-summary"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			generation: { avg: number; p50: number; p95: number; count: number };
			evaluation: { avg: number; p50: number; p95: number; count: number };
			endToEnd: { avg: number; p50: number; p95: number; count: number };
		};
		expect(body.generation.count).toBe(0);
		expect(body.generation.avg).toBe(0);
		expect(body.evaluation.count).toBe(0);
		expect(body.evaluation.avg).toBe(0);
		expect(body.endToEnd.count).toBe(0);
		expect(body.endToEnd.avg).toBe(0);
	});

	it("GET /api/analytics/latency-over-time should return empty array", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/analytics/latency-over-time"),
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as Array<{
			date: string;
			avgGenerationMs: number;
			avgEvaluationMs: number;
			adCount: number;
		}>;
		expect(body).toBeArray();
		expect(body.length).toBe(0);
	});
});
