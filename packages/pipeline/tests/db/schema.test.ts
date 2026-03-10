import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../src/db/schema.js";

function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON;");
	const db = drizzle(sqlite, { schema });

	// Create all tables manually for in-memory testing
	sqlite.exec(`
		CREATE TABLE competitor_ads (
			id TEXT PRIMARY KEY,
			advertiser TEXT NOT NULL,
			primary_text TEXT NOT NULL,
			headline TEXT NOT NULL,
			description TEXT NOT NULL,
			start_date TEXT NOT NULL,
			end_date TEXT NOT NULL,
			duration_days INTEGER NOT NULL,
			platform TEXT NOT NULL,
			scraped_at TEXT NOT NULL
		);

		CREATE TABLE ad_briefs (
			id TEXT PRIMARY KEY,
			audience TEXT NOT NULL,
			product TEXT NOT NULL,
			campaign_goal TEXT NOT NULL,
			emotional_angle TEXT NOT NULL,
			hook_style TEXT NOT NULL,
			body_pattern TEXT NOT NULL,
			offer_type TEXT NOT NULL,
			brand_voice TEXT NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE generated_ads (
			id TEXT PRIMARY KEY,
			brief_id TEXT NOT NULL REFERENCES ad_briefs(id),
			primary_text TEXT NOT NULL,
			headline TEXT NOT NULL,
			description TEXT NOT NULL,
			call_to_action TEXT NOT NULL,
			model TEXT NOT NULL,
			prompt_tokens INTEGER NOT NULL,
			completion_tokens INTEGER NOT NULL,
			latency_ms INTEGER NOT NULL,
			iteration INTEGER NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			created_at TEXT NOT NULL
		);

		CREATE TABLE evaluations (
			id TEXT PRIMARY KEY,
			ad_id TEXT NOT NULL REFERENCES generated_ads(id),
			dimensions TEXT NOT NULL,
			weighted_score REAL NOT NULL,
			confidence REAL NOT NULL,
			model TEXT NOT NULL,
			tokens_used INTEGER NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE iteration_logs (
			id TEXT PRIMARY KEY,
			brief_id TEXT NOT NULL REFERENCES ad_briefs(id),
			iteration INTEGER NOT NULL,
			ad_id TEXT NOT NULL REFERENCES generated_ads(id),
			evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
			weakest_dimension TEXT NOT NULL,
			action TEXT NOT NULL,
			score_before REAL NOT NULL,
			score_after REAL NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE token_usage (
			id TEXT PRIMARY KEY,
			operation TEXT NOT NULL,
			model TEXT NOT NULL,
			prompt_tokens INTEGER NOT NULL,
			completion_tokens INTEGER NOT NULL,
			total_tokens INTEGER NOT NULL,
			cost_usd REAL NOT NULL,
			created_at TEXT NOT NULL
		);
	`);

	return { db, sqlite };
}

describe("Database schema", () => {
	test("all 6 tables exist", () => {
		const { sqlite } = createTestDb();
		const tables = sqlite
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
			)
			.all() as { name: string }[];
		const tableNames = tables.map((t) => t.name);
		expect(tableNames).toContain("competitor_ads");
		expect(tableNames).toContain("ad_briefs");
		expect(tableNames).toContain("generated_ads");
		expect(tableNames).toContain("evaluations");
		expect(tableNames).toContain("iteration_logs");
		expect(tableNames).toContain("token_usage");
	});

	test("insert and query competitor_ads", () => {
		const { db } = createTestDb();
		const now = new Date().toISOString();
		db.insert(schema.competitorAds)
			.values({
				id: "comp-1",
				advertiser: "Acme Corp",
				primaryText: "Best product ever",
				headline: "Acme Headline",
				description: "Acme description",
				startDate: "2025-01-01",
				endDate: "2025-02-01",
				durationDays: 31,
				platform: "facebook",
				scrapedAt: now,
			})
			.run();

		const rows = db
			.select()
			.from(schema.competitorAds)
			.where(eq(schema.competitorAds.id, "comp-1"))
			.all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.advertiser).toBe("Acme Corp");
		expect(rows[0]?.durationDays).toBe(31);
	});

	test("insert and query ad_briefs", () => {
		const { db } = createTestDb();
		db.insert(schema.adBriefs)
			.values({
				id: "brief-1",
				audience: "parent",
				product: "Math App",
				campaignGoal: "conversion",
				emotionalAngle: "aspiration",
				hookStyle: "question",
				bodyPattern: "problem-agitate-solution",
				offerType: "Free Trial",
				brandVoice: JSON.stringify(["friendly", "encouraging"]),
				createdAt: new Date().toISOString(),
			})
			.run();

		const rows = db.select().from(schema.adBriefs).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.audience).toBe("parent");
		expect(JSON.parse(rows[0]?.brandVoice ?? "[]")).toEqual([
			"friendly",
			"encouraging",
		]);
	});

	test("insert and query generated_ads with FK to ad_briefs", () => {
		const { db } = createTestDb();
		db.insert(schema.adBriefs)
			.values({
				id: "brief-2",
				audience: "student",
				product: "Study Tool",
				campaignGoal: "awareness",
				emotionalAngle: "social-proof",
				hookStyle: "stat",
				bodyPattern: "testimonial-benefit",
				offerType: "Discount",
				brandVoice: JSON.stringify(["bold"]),
				createdAt: new Date().toISOString(),
			})
			.run();

		db.insert(schema.generatedAds)
			.values({
				id: "ad-1",
				briefId: "brief-2",
				primaryText: "Study smarter",
				headline: "Top Grades",
				description: "AI study tool",
				callToAction: "Sign Up Now",
				model: "gpt-4o",
				promptTokens: 500,
				completionTokens: 200,
				latencyMs: 1200,
				iteration: 1,
				status: "draft",
				createdAt: new Date().toISOString(),
			})
			.run();

		const rows = db.select().from(schema.generatedAds).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.briefId).toBe("brief-2");
		expect(rows[0]?.promptTokens).toBe(500);
	});

	test("FK constraint prevents orphan generated_ads", () => {
		const { db } = createTestDb();
		expect(() => {
			db.insert(schema.generatedAds)
				.values({
					id: "ad-orphan",
					briefId: "nonexistent-brief",
					primaryText: "text",
					headline: "headline",
					description: "desc",
					callToAction: "cta",
					model: "gpt-4o",
					promptTokens: 100,
					completionTokens: 50,
					latencyMs: 500,
					iteration: 1,
					status: "draft",
					createdAt: new Date().toISOString(),
				})
				.run();
		}).toThrow();
	});

	test("insert and query evaluations", () => {
		const { db } = createTestDb();
		db.insert(schema.adBriefs)
			.values({
				id: "brief-3",
				audience: "family",
				product: "Homework Helper",
				campaignGoal: "conversion",
				emotionalAngle: "urgency",
				hookStyle: "fear",
				bodyPattern: "stat-context-offer",
				offerType: "Limited Time",
				brandVoice: JSON.stringify(["urgent"]),
				createdAt: new Date().toISOString(),
			})
			.run();

		db.insert(schema.generatedAds)
			.values({
				id: "ad-2",
				briefId: "brief-3",
				primaryText: "Don't wait",
				headline: "Act Now",
				description: "Limited offer",
				callToAction: "Buy Now",
				model: "gpt-4o",
				promptTokens: 400,
				completionTokens: 150,
				latencyMs: 900,
				iteration: 1,
				status: "draft",
				createdAt: new Date().toISOString(),
			})
			.run();

		const dimensions = JSON.stringify([
			{ dimension: "clarity", score: 8, rationale: "Clear" },
		]);

		db.insert(schema.evaluations)
			.values({
				id: "eval-1",
				adId: "ad-2",
				dimensions,
				weightedScore: 7.5,
				confidence: 0.9,
				model: "gpt-4o",
				tokensUsed: 300,
				createdAt: new Date().toISOString(),
			})
			.run();

		const rows = db.select().from(schema.evaluations).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.weightedScore).toBe(7.5);
		expect(rows[0]?.confidence).toBe(0.9);
	});

	test("insert and query iteration_logs", () => {
		const { db } = createTestDb();
		db.insert(schema.adBriefs)
			.values({
				id: "brief-4",
				audience: "parent",
				product: "Reading App",
				campaignGoal: "awareness",
				emotionalAngle: "aspiration",
				hookStyle: "story",
				bodyPattern: "problem-agitate-solution",
				offerType: "Free",
				brandVoice: JSON.stringify(["warm"]),
				createdAt: new Date().toISOString(),
			})
			.run();

		db.insert(schema.generatedAds)
			.values({
				id: "ad-3",
				briefId: "brief-4",
				primaryText: "Read more",
				headline: "Reading Fun",
				description: "Kids love it",
				callToAction: "Try Free",
				model: "gpt-4o",
				promptTokens: 300,
				completionTokens: 100,
				latencyMs: 800,
				iteration: 1,
				status: "draft",
				createdAt: new Date().toISOString(),
			})
			.run();

		db.insert(schema.evaluations)
			.values({
				id: "eval-2",
				adId: "ad-3",
				dimensions: "[]",
				weightedScore: 6.0,
				confidence: 0.8,
				model: "gpt-4o",
				tokensUsed: 250,
				createdAt: new Date().toISOString(),
			})
			.run();

		db.insert(schema.iterationLogs)
			.values({
				id: "log-1",
				briefId: "brief-4",
				iteration: 1,
				adId: "ad-3",
				evaluationId: "eval-2",
				weakestDimension: "callToAction",
				action: "regenerate",
				scoreBefore: 5.0,
				scoreAfter: 7.0,
				createdAt: new Date().toISOString(),
			})
			.run();

		const rows = db.select().from(schema.iterationLogs).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.weakestDimension).toBe("callToAction");
		expect(rows[0]?.scoreBefore).toBe(5.0);
	});

	test("insert and query token_usage", () => {
		const { db } = createTestDb();
		db.insert(schema.tokenUsage)
			.values({
				id: "token-1",
				operation: "generate",
				model: "gpt-4o",
				promptTokens: 1000,
				completionTokens: 500,
				totalTokens: 1500,
				costUsd: 0.045,
				createdAt: new Date().toISOString(),
			})
			.run();

		const rows = db.select().from(schema.tokenUsage).all();
		expect(rows).toHaveLength(1);
		expect(rows[0]?.totalTokens).toBe(1500);
		expect(rows[0]?.costUsd).toBeCloseTo(0.045);
	});
});
