import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { setupDatabaseFromSqlite } from "../src/db.js";
import { adRoutes } from "../src/routes/ads.js";

interface AdsListResponse {
	ads: Array<{ id: string; status: string; imageUrl: string | null }>;
	total: number;
}

interface AdDetailResponse {
	ad: { id: string; imageUrl: string | null };
	evaluations: Array<{ dimensions: unknown[] }>;
}

function createTestApp() {
	const sqlite = new Database(":memory:");
	const db = setupDatabaseFromSqlite(sqlite);
	const app = new Elysia().use(adRoutes(db));
	return { app, db, sqlite };
}

function seedTestData(sqlite: Database) {
	sqlite.exec(`
		INSERT INTO ad_briefs (id, audience, product, campaign_goal, emotional_angle, hook_style, body_pattern, offer_type, brand_voice, created_at)
		VALUES ('brief-1', 'parent', 'Varsity Tutors', 'conversion', 'aspiration', 'question', 'problem-agitate-solution', 'Free consultation', '["empowering"]', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-1', 'brief-1', 'Primary text 1', 'Headline 1', 'Description 1', 'CTA 1', 'gpt-4', 100, 50, 500, 1, 'generating', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-2', 'brief-1', 'Primary text 2', 'Headline 2', 'Description 2', 'CTA 2', 'gpt-4', 100, 50, 500, 1, 'approved', '2026-01-02T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, image_url, created_at)
		VALUES ('ad-3', 'brief-1', 'Primary text 3', 'Headline 3', 'Description 3', 'CTA 3', 'gpt-4', 100, 50, 500, 2, 'approved', '/images/ad-3.png', '2026-01-03T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, created_at)
		VALUES ('eval-1', 'ad-1', '[{"dimension":"clarity","score":8,"rationale":"Clear"}]', 0.8, 0.9, 'gpt-4', 200, '2026-01-01T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, created_at)
		VALUES ('eval-2', 'ad-2', '[{"dimension":"clarity","score":9,"rationale":"Very clear"}]', 0.9, 0.95, 'gpt-4', 200, '2026-01-02T00:00:00Z');
	`);
}

describe("ads routes", () => {
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

	describe("GET /api/ads", () => {
		it("should return ads with pagination shape", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads"),
			);
			const body = (await response.json()) as AdsListResponse;
			expect(response.status).toBe(200);
			expect(body).toHaveProperty("ads");
			expect(body).toHaveProperty("total");
			expect(body.ads).toBeArray();
			expect(body.total).toBe(3);
		});

		it("should respect limit parameter", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads?limit=1"),
			);
			const body = (await response.json()) as AdsListResponse;
			expect(response.status).toBe(200);
			expect(body.ads).toHaveLength(1);
			expect(body.total).toBe(3);
		});

		it("should filter by status", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads?status=approved"),
			);
			const body = (await response.json()) as AdsListResponse;
			expect(response.status).toBe(200);
			expect(body.ads).toHaveLength(2);
			expect(body.total).toBe(2);
			for (const ad of body.ads) {
				expect(ad.status).toBe("approved");
			}
		});

		it("should return imageUrl field for ads", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads?status=approved"),
			);
			const body = (await response.json()) as AdsListResponse;
			expect(response.status).toBe(200);
			const adWithImage = body.ads.find((a) => a.id === "ad-3");
			expect(adWithImage?.imageUrl).toBe("/images/ad-3.png");
		});
	});

	describe("GET /api/ads/:id", () => {
		it("should return ad with evaluations", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads/ad-1"),
			);
			const body = (await response.json()) as AdDetailResponse;
			expect(response.status).toBe(200);
			expect(body).toHaveProperty("ad");
			expect(body).toHaveProperty("evaluations");
			expect(body.ad.id).toBe("ad-1");
			expect(body.evaluations).toHaveLength(1);
			expect(body.evaluations[0]?.dimensions).toBeArray();
		});

		it("should return 404 for non-existent ad", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads/nonexistent"),
			);
			expect(response.status).toBe(404);
			const body = (await response.json()) as { error: string };
			expect(body).toHaveProperty("error");
		});

		it("should include imageUrl in ad detail", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads/ad-3"),
			);
			const body = (await response.json()) as AdDetailResponse;
			expect(response.status).toBe(200);
			expect(body.ad.imageUrl).toBe("/images/ad-3.png");
		});
	});

	describe("POST /api/ads/:id/generate-image", () => {
		it("should return 404 for non-existent ad", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads/nonexistent/generate-image", {
					method: "POST",
				}),
			);
			expect(response.status).toBe(404);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Ad not found");
		});

		it("should return 400 for non-approved ad", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/ads/ad-1/generate-image", {
					method: "POST",
				}),
			);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Only approved ads can have images generated");
		});

		it("should return 500 when OPENROUTER_API_KEY is not set", async () => {
			const originalKey = process.env.OPENROUTER_API_KEY;
			process.env.OPENROUTER_API_KEY = "";
			try {
				const response = await app.handle(
					new Request("http://localhost/api/ads/ad-3/generate-image", {
						method: "POST",
					}),
				);
				expect(response.status).toBe(500);
				const body = (await response.json()) as { error: string };
				expect(body.error).toBe("OPENROUTER_API_KEY not configured");
			} finally {
				if (originalKey) {
					process.env.OPENROUTER_API_KEY = originalKey;
				}
			}
		});
	});
});
