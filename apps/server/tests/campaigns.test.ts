import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";
import { setupDatabaseFromSqlite } from "../src/db.js";

// Mock the pipeline module before importing routes
// runPipeline tries to create a real DB connection; generateBriefs is pure
mock.module("@nerdy/pipeline", () => {
	const actual = require("@nerdy/pipeline");
	return {
		...actual,
		generateBriefs: (count: number) => {
			const briefs = [];
			for (let i = 0; i < count; i++) {
				briefs.push({
					audience: "parent",
					product: "Varsity Tutors",
					campaignGoal: "conversion",
					emotionalAngle: "aspiration",
					hookStyle: "question",
					bodyPattern: "problem-agitate-solution",
					offerType: "Free consultation",
					brandVoice: ["empowering"],
				});
			}
			return briefs;
		},
		runPipeline: async () => [],
	};
});

import { campaignRoutes } from "../src/routes/campaigns.js";

interface CampaignListResponse {
	campaigns: Array<{ id: string; status: string; createdAt: string }>;
}

interface CampaignDetailResponse {
	campaign: { id: string; name: string; prompt: string };
	briefs: Array<{ id: string }>;
	ads: Array<{ id: string }>;
	evaluations: Array<{ dimensions: unknown[] }>;
}

function createTestApp() {
	const sqlite = new Database(":memory:");
	const db = setupDatabaseFromSqlite(sqlite);
	const app = new Elysia().use(campaignRoutes(db));
	return { app, db, sqlite };
}

function seedCampaigns(sqlite: Database) {
	sqlite.exec(`
		INSERT INTO campaigns (id, name, prompt, description, status, ad_count, created_at)
		VALUES ('camp-1', 'Summer Math', 'Back to school math campaign', 'Math campaign description', 'completed', 3, '2026-01-01T00:00:00Z');

		INSERT INTO campaigns (id, name, prompt, description, status, ad_count, created_at)
		VALUES ('camp-2', 'SAT Prep', 'SAT prep campaign for high schoolers', 'SAT campaign', 'generating', 5, '2026-01-02T00:00:00Z');

		INSERT INTO ad_briefs (id, audience, product, campaign_goal, emotional_angle, hook_style, body_pattern, offer_type, brand_voice, campaign_id, created_at)
		VALUES ('brief-c1', 'parent', 'Varsity Tutors', 'conversion', 'aspiration', 'question', 'problem-agitate-solution', 'Free consultation', '["empowering"]', 'camp-1', '2026-01-01T00:00:00Z');

		INSERT INTO generated_ads (id, brief_id, primary_text, headline, description, call_to_action, model, prompt_tokens, completion_tokens, latency_ms, iteration, status, created_at)
		VALUES ('ad-c1', 'brief-c1', 'Primary text', 'Headline', 'Description', 'Learn More', 'gemini', 100, 50, 500, 1, 'published', '2026-01-01T00:00:00Z');

		INSERT INTO evaluations (id, ad_id, dimensions, weighted_score, confidence, model, tokens_used, created_at)
		VALUES ('eval-c1', 'ad-c1', '[{"dimension":"clarity","score":8,"rationale":"Clear"}]', 8.0, 0.9, 'gemini', 200, '2026-01-01T00:00:00Z');
	`);
}

describe("campaign routes", () => {
	let app: ReturnType<typeof createTestApp>["app"];
	let sqlite: Database;

	beforeAll(() => {
		const test = createTestApp();
		app = test.app;
		sqlite = test.sqlite;
		seedCampaigns(sqlite);
	});

	afterAll(() => {
		sqlite.close();
	});

	describe("GET /api/campaigns", () => {
		it("should return campaigns list", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as CampaignListResponse;
			expect(body.campaigns).toBeArray();
			expect(body.campaigns.length).toBe(2);
		});

		it("should order by createdAt desc", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns"),
			);
			const body = (await response.json()) as CampaignListResponse;
			expect(body.campaigns[0]?.id).toBe("camp-2");
		});
	});

	describe("GET /api/campaigns/:id", () => {
		it("should return campaign with briefs, ads, and evaluations", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns/camp-1"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as CampaignDetailResponse;
			expect(body.campaign.id).toBe("camp-1");
			expect(body.briefs).toBeArray();
			expect(body.briefs.length).toBe(1);
			expect(body.ads).toBeArray();
			expect(body.ads.length).toBe(1);
			expect(body.evaluations).toBeArray();
			expect(body.evaluations.length).toBe(1);
		});

		it("should return empty arrays for campaign with no briefs", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns/camp-2"),
			);
			expect(response.status).toBe(200);
			const body = (await response.json()) as CampaignDetailResponse;
			expect(body.campaign.id).toBe("camp-2");
			expect(body.briefs).toBeArray();
			expect(body.briefs.length).toBe(0);
			expect(body.ads).toBeArray();
			expect(body.ads.length).toBe(0);
		});

		it("should return 404 for non-existent campaign", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns/nonexistent"),
			);
			expect(response.status).toBe(404);
			const body = (await response.json()) as { error: string };
			expect(body).toHaveProperty("error");
		});
	});

	describe("POST /api/campaigns", () => {
		it("should create a campaign and return 202", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						prompt: "Test campaign for math tutoring",
						count: 2,
					}),
				}),
			);
			expect(response.status).toBe(202);
			const body = (await response.json()) as {
				id: string;
				status: string;
			};
			expect(body.id).toBeDefined();
			expect(body.status).toBe("generating");
		});

		it("should use default count of 3 when not specified", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ prompt: "Another campaign" }),
				}),
			);
			expect(response.status).toBe(202);
			const body = (await response.json()) as {
				id: string;
				status: string;
			};
			expect(body.id).toBeDefined();
		});
	});

	describe("POST /api/campaigns/:id/generate", () => {
		it("should trigger generation for existing campaign", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns/camp-1/generate", {
					method: "POST",
				}),
			);
			expect(response.status).toBe(202);
			const body = (await response.json()) as {
				id: string;
				status: string;
			};
			expect(body.id).toBe("camp-1");
			expect(body.status).toBe("generating");
		});

		it("should return 404 for non-existent campaign", async () => {
			const response = await app.handle(
				new Request("http://localhost/api/campaigns/nonexistent/generate", {
					method: "POST",
				}),
			);
			expect(response.status).toBe(404);
		});
	});
});
