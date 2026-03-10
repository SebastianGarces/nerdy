import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { nanoid } from "nanoid";
import type { createDb } from "../../src/db/index.js";
import * as schema from "../../src/db/schema.js";
import type { LLMInterface } from "../../src/evaluate/index.js";
import { createAdPipelineGraph } from "../../src/graph/index.js";
import type {
	AdBrief,
	EvaluationDimension,
	PipelineConfig,
} from "../../src/types/index.js";

const SQL_CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, prompt TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'generating', ad_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ad_briefs (id TEXT PRIMARY KEY, audience TEXT NOT NULL, product TEXT NOT NULL, campaign_goal TEXT NOT NULL, emotional_angle TEXT NOT NULL, hook_style TEXT NOT NULL, body_pattern TEXT NOT NULL, offer_type TEXT NOT NULL, brand_voice TEXT NOT NULL, campaign_id TEXT REFERENCES campaigns(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS generated_ads (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, primary_text TEXT NOT NULL, headline TEXT NOT NULL, description TEXT NOT NULL, call_to_action TEXT NOT NULL, model TEXT NOT NULL, prompt_tokens INTEGER NOT NULL, completion_tokens INTEGER NOT NULL, latency_ms INTEGER NOT NULL, iteration INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, ad_id TEXT NOT NULL, dimensions TEXT NOT NULL, weighted_score REAL NOT NULL, confidence REAL NOT NULL, model TEXT NOT NULL, tokens_used INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS iteration_logs (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, iteration INTEGER NOT NULL, ad_id TEXT NOT NULL, evaluation_id TEXT NOT NULL, weakest_dimension TEXT NOT NULL, action TEXT NOT NULL, score_before REAL NOT NULL, score_after REAL NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS token_usage (id TEXT PRIMARY KEY, operation TEXT NOT NULL, model TEXT NOT NULL, prompt_tokens INTEGER NOT NULL, completion_tokens INTEGER NOT NULL, total_tokens INTEGER NOT NULL, cost_usd REAL NOT NULL, created_at TEXT NOT NULL);
`;

const mockBrief: AdBrief = {
	audience: "parent",
	product: "1-on-1 Math Tutoring",
	campaignGoal: "conversion",
	emotionalAngle: "aspiration",
	hookStyle: "question",
	bodyPattern: "problem-agitate-solution",
	offerType: "Free trial session",
	brandVoice: ["empowering", "knowledgeable"],
};

const mockConfig: PipelineConfig = {
	openRouterApiKey: "test-key",
	openRouterBaseUrl: "https://openrouter.ai/api/v1",
	databaseUrl: ":memory:",
};

function makeDimensions(baseScore: number): Array<{
	dimension: string;
	score: number;
	rationale: string;
}> {
	const dims: EvaluationDimension[] = [
		"clarity",
		"valueProposition",
		"callToAction",
		"brandVoice",
		"emotionalResonance",
	];
	return dims.map((d) => ({
		dimension: d,
		score: baseScore,
		rationale: `${d} is ${baseScore >= 7 ? "good" : "needs work"}`,
	}));
}

/**
 * Creates a mock generate LLM that returns structured ad output.
 * We mock the withStructuredOutput chain.
 */
function createMockGenerateLlm() {
	return {
		withStructuredOutput: () => ({
			invoke: async () => ({
				primaryText: "Test primary text for the ad",
				headline: "Test Headline",
				description: "Test description for the ad",
				callToAction: "Get Started",
			}),
		}),
		// biome-ignore lint/suspicious/noExplicitAny: mock for testing
	} as any;
}

function createMockEvaluateLlm(scoreSequence: number[]): LLMInterface {
	let callIndex = 0;
	return {
		invoke: async () => {
			const idx = Math.min(callIndex, scoreSequence.length - 1);
			const score = scoreSequence[idx] ?? 5;
			callIndex++;
			return {
				dimensions: makeDimensions(score),
				confidence: 0.85,
			};
		},
	};
}

/**
 * Helper to create an in-memory DB with the correct schema type.
 * Uses a raw Database + SQL for table creation, then wraps with createDb-compatible drizzle.
 */
function setupTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(SQL_CREATE_TABLES);
	// biome-ignore lint/suspicious/noExplicitAny: need to access internal drizzle constructor with schema
	const { drizzle } = require("drizzle-orm/bun-sqlite") as any;
	const db = drizzle(sqlite, { schema }) as ReturnType<typeof createDb>;
	return { sqlite, db };
}

describe("Ad Pipeline Graph", () => {
	let sqlite: Database;
	let db: ReturnType<typeof createDb>;

	beforeEach(() => {
		const setup = setupTestDb();
		sqlite = setup.sqlite;
		db = setup.db;
	});

	afterEach(() => {
		sqlite.close();
	});

	function insertBrief(briefId: string) {
		db.insert(schema.adBriefs)
			.values({
				id: briefId,
				audience: mockBrief.audience,
				product: mockBrief.product,
				campaignGoal: mockBrief.campaignGoal,
				emotionalAngle: mockBrief.emotionalAngle,
				hookStyle: mockBrief.hookStyle,
				bodyPattern: mockBrief.bodyPattern,
				offerType: mockBrief.offerType,
				brandVoice: JSON.stringify(mockBrief.brandVoice),
				createdAt: new Date().toISOString(),
			})
			.run();
	}

	it("publishes on first try when score >= 7.0", async () => {
		const briefId = nanoid();
		insertBrief(briefId);

		const graph = createAdPipelineGraph(db, {
			generateLlm: createMockGenerateLlm(),
			evaluateLlm: createMockEvaluateLlm([8]),
		});

		const result = await graph.invoke({
			brief: mockBrief,
			briefId,
			config: mockConfig,
			maxIterations: 3,
		});

		expect(result.status).toBe("published");
		expect(result.currentAd).not.toBeNull();
		expect(result.evaluations).toHaveLength(1);
		expect(result.iterationCount).toBe(1);

		const ads = db.select().from(schema.generatedAds).all();
		expect(ads).toHaveLength(1);
		expect(ads[0]?.status).toBe("published");

		const evals = db.select().from(schema.evaluations).all();
		expect(evals).toHaveLength(1);

		const logs = db.select().from(schema.iterationLogs).all();
		expect(logs).toHaveLength(1);
		expect(logs[0]?.action).toBe("publish");
	});

	it("iterates and publishes when second attempt passes", async () => {
		const briefId = nanoid();
		insertBrief(briefId);

		const graph = createAdPipelineGraph(db, {
			generateLlm: createMockGenerateLlm(),
			evaluateLlm: createMockEvaluateLlm([5, 8]),
		});

		const result = await graph.invoke({
			brief: mockBrief,
			briefId,
			config: mockConfig,
			maxIterations: 3,
		});

		expect(result.status).toBe("published");
		expect(result.evaluations).toHaveLength(2);
		expect(result.iterationCount).toBe(2);

		const ads = db.select().from(schema.generatedAds).all();
		expect(ads).toHaveLength(2);

		const evals = db.select().from(schema.evaluations).all();
		expect(evals).toHaveLength(2);
	});

	it("discards after maxIterations failures", async () => {
		const briefId = nanoid();
		insertBrief(briefId);

		const graph = createAdPipelineGraph(db, {
			generateLlm: createMockGenerateLlm(),
			evaluateLlm: createMockEvaluateLlm([4, 4, 4]),
		});

		const result = await graph.invoke({
			brief: mockBrief,
			briefId,
			config: mockConfig,
			maxIterations: 3,
		});

		expect(result.status).toBe("discarded");
		expect(result.evaluations).toHaveLength(3);

		const ads = db.select().from(schema.generatedAds).all();
		expect(ads).toHaveLength(3);

		const logs = db.select().from(schema.iterationLogs).all();
		expect(logs).toHaveLength(1);
		expect(logs[0]?.action).toBe("discard");
	});
});
