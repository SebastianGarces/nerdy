import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { createDb } from "../../src/db/index.js";
import * as schema from "../../src/db/schema.js";
import type { LLMInterface } from "../../src/evaluate/index.js";
import { runPipeline } from "../../src/graph/runner.js";
import type {
	AdBrief,
	EvaluationDimension,
	PipelineConfig,
} from "../../src/types/index.js";

const SQL_CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, prompt TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'generating', ad_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ad_briefs (id TEXT PRIMARY KEY, audience TEXT NOT NULL, product TEXT NOT NULL, campaign_goal TEXT NOT NULL, emotional_angle TEXT NOT NULL, hook_style TEXT NOT NULL, body_pattern TEXT NOT NULL, offer_type TEXT NOT NULL, brand_voice TEXT NOT NULL, campaign_id TEXT REFERENCES campaigns(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS generated_ads (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, primary_text TEXT NOT NULL, headline TEXT NOT NULL, description TEXT NOT NULL, call_to_action TEXT NOT NULL, model TEXT NOT NULL, prompt_tokens INTEGER NOT NULL, completion_tokens INTEGER NOT NULL, latency_ms INTEGER NOT NULL, iteration INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'generating', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, ad_id TEXT NOT NULL, dimensions TEXT NOT NULL, weighted_score REAL NOT NULL, confidence REAL NOT NULL, model TEXT NOT NULL, tokens_used INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS iteration_logs (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, iteration INTEGER NOT NULL, ad_id TEXT NOT NULL, evaluation_id TEXT NOT NULL, weakest_dimension TEXT NOT NULL, action TEXT NOT NULL, score_before REAL NOT NULL, score_after REAL NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS token_usage (id TEXT PRIMARY KEY, operation TEXT NOT NULL, model TEXT NOT NULL, prompt_tokens INTEGER NOT NULL, completion_tokens INTEGER NOT NULL, total_tokens INTEGER NOT NULL, cost_usd REAL NOT NULL, created_at TEXT NOT NULL);
`;

const mockBrief: AdBrief = {
	audience: "parent",
	product: "Varsity Tutors",
	campaignGoal: "conversion",
	emotionalAngle: "aspiration",
	hookStyle: "question",
	bodyPattern: "problem-agitate-solution",
	offerType: "Free consultation",
	brandVoice: ["empowering", "approachable"],
};

const mockConfig: PipelineConfig = {
	openRouterApiKey: "test-key",
	openRouterBaseUrl: "https://openrouter.ai/api/v1",
};

function makeDimensions(baseScore: number) {
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

function createMockGenerateLlm() {
	return {
		withStructuredOutput: () => ({
			invoke: async () => ({
				raw: { response_metadata: {} },
				parsed: {
					primaryText: "Test primary text",
					headline: "Test Headline",
					description: "Test description",
					callToAction: "Get Started",
				},
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

function setupTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(SQL_CREATE_TABLES);
	// biome-ignore lint/suspicious/noExplicitAny: need to access internal drizzle constructor with schema
	const { drizzle } = require("drizzle-orm/bun-sqlite") as any;
	const db = drizzle(sqlite, { schema }) as ReturnType<typeof createDb>;
	return { sqlite, db };
}

describe("runPipeline retry loop", () => {
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

	it("returns all results without retry when no targetCount", async () => {
		const briefs = [mockBrief, mockBrief];
		const results = await runPipeline(briefs, mockConfig, db, {
			nodeOptions: {
				generateLlm: createMockGenerateLlm(),
				evaluateLlm: createMockEvaluateLlm([8, 8]),
			},
		});

		expect(results).toHaveLength(2);
		expect(results.every((r) => r.status === "published")).toBe(true);
	});

	it("retries to fill deficit when some briefs are discarded", async () => {
		// First call: 2 briefs, one publishes (score 8), one discarded (score 4 x3)
		// generateMoreBriefs called with deficit=1, returns 1 brief that publishes
		let evalCallIndex = 0;
		const scoreSequence = [8, 4, 4, 4, 8]; // brief1: publish, brief2: 3 fails -> discard, brief3: publish
		const evaluateLlm: LLMInterface = {
			invoke: async () => {
				const idx = Math.min(evalCallIndex, scoreSequence.length - 1);
				const score = scoreSequence[idx] ?? 5;
				evalCallIndex++;
				return {
					dimensions: makeDimensions(score),
					confidence: 0.85,
				};
			},
		};

		const generateMoreBriefs = mock(async (count: number) => {
			return Array.from({ length: count }, () => ({ ...mockBrief }));
		});

		const results = await runPipeline([mockBrief, mockBrief], mockConfig, db, {
			targetCount: 2,
			maxRetryRounds: 3,
			generateMoreBriefs,
			nodeOptions: {
				generateLlm: createMockGenerateLlm(),
				evaluateLlm,
			},
		});

		const published = results.filter((r) => r.status === "published");
		expect(published).toHaveLength(2);
		expect(generateMoreBriefs).toHaveBeenCalledWith(1);
	});

	it("stops retrying after maxRetryRounds", async () => {
		// All briefs get discarded every round
		const evaluateLlm: LLMInterface = {
			invoke: async () => ({
				dimensions: makeDimensions(4),
				confidence: 0.85,
			}),
		};

		const generateMoreBriefs = mock(async (count: number) => {
			return Array.from({ length: count }, () => ({ ...mockBrief }));
		});

		const results = await runPipeline([mockBrief], mockConfig, db, {
			targetCount: 1,
			maxRetryRounds: 2,
			generateMoreBriefs,
			nodeOptions: {
				generateLlm: createMockGenerateLlm(),
				evaluateLlm,
			},
		});

		const published = results.filter((r) => r.status === "published");
		expect(published).toHaveLength(0);
		// Should have called generateMoreBriefs exactly 2 times (maxRetryRounds)
		expect(generateMoreBriefs).toHaveBeenCalledTimes(2);
	});

	it("does not retry when target is already met", async () => {
		const generateMoreBriefs = mock(async (count: number) => {
			return Array.from({ length: count }, () => ({ ...mockBrief }));
		});

		const results = await runPipeline([mockBrief, mockBrief], mockConfig, db, {
			targetCount: 2,
			generateMoreBriefs,
			nodeOptions: {
				generateLlm: createMockGenerateLlm(),
				evaluateLlm: createMockEvaluateLlm([8, 8]),
			},
		});

		const published = results.filter((r) => r.status === "published");
		expect(published).toHaveLength(2);
		expect(generateMoreBriefs).not.toHaveBeenCalled();
	});
});
