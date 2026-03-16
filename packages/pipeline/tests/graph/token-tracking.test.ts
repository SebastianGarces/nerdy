import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { nanoid } from "nanoid";
import type { createDb } from "../../src/db/index.js";
import * as schema from "../../src/db/schema.js";
import type { LLMInterface } from "../../src/evaluate/index.js";
import { createNodes } from "../../src/graph/nodes.js";
import type { AdPipelineStateType } from "../../src/graph/state.js";
import type {
	AdBrief,
	GeneratedAd,
	PipelineConfig,
} from "../../src/types/index.js";

const SQL_CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, name TEXT NOT NULL, prompt TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'generating', ad_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ad_briefs (id TEXT PRIMARY KEY, audience TEXT NOT NULL, product TEXT NOT NULL, campaign_goal TEXT NOT NULL, emotional_angle TEXT NOT NULL, hook_style TEXT NOT NULL, body_pattern TEXT NOT NULL, offer_type TEXT NOT NULL, brand_voice TEXT NOT NULL, proof_points TEXT, persona TEXT, campaign_id TEXT REFERENCES campaigns(id), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS generated_ads (id TEXT PRIMARY KEY, brief_id TEXT NOT NULL, primary_text TEXT NOT NULL, headline TEXT NOT NULL, description TEXT NOT NULL, call_to_action TEXT NOT NULL, model TEXT NOT NULL, prompt_tokens INTEGER NOT NULL, completion_tokens INTEGER NOT NULL, latency_ms INTEGER NOT NULL, iteration INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'generating', image_url TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS evaluations (id TEXT PRIMARY KEY, ad_id TEXT NOT NULL, dimensions TEXT NOT NULL, weighted_score REAL NOT NULL, confidence REAL NOT NULL, model TEXT NOT NULL, tokens_used INTEGER NOT NULL, latency_ms INTEGER DEFAULT 0, created_at TEXT NOT NULL);
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
};

function createMockGenerateLlm() {
	return {
		withStructuredOutput: () => ({
			invoke: async () => ({
				raw: {
					response_metadata: {
						tokenUsage: {
							totalTokens: 300,
							promptTokens: 200,
							completionTokens: 100,
						},
					},
				},
				parsed: {
					primaryText: "Test primary text for the ad",
					headline: "Test Headline",
					description: "Test description for the ad",
					callToAction: "Get Started",
				},
			}),
		}),
		// biome-ignore lint/suspicious/noExplicitAny: mock for testing
	} as any;
}

function createMockGenerateLlmNoTokens() {
	return {
		withStructuredOutput: () => ({
			invoke: async () => ({
				raw: {
					response_metadata: {},
				},
				parsed: {
					primaryText: "Test primary text for the ad",
					headline: "Test Headline",
					description: "Test description for the ad",
					callToAction: "Get Started",
				},
			}),
		}),
		// biome-ignore lint/suspicious/noExplicitAny: mock for testing
	} as any;
}

/** Mock evaluate LLM that returns tokensUsed on the result */
function createMockEvaluateLlmWithTokens(score: number): LLMInterface {
	return {
		invoke: async () => {
			return {
				dimensions: [
					{ dimension: "clarity", score, rationale: "test" },
					{ dimension: "valueProposition", score, rationale: "test" },
					{ dimension: "callToAction", score, rationale: "test" },
					{ dimension: "brandVoice", score, rationale: "test" },
					{
						dimension: "emotionalResonance",
						score,
						rationale: "test",
					},
				],
				confidence: 0.85,
				tokensUsed: {
					totalTokens: 500,
					promptTokens: 350,
					completionTokens: 150,
				},
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

describe("Token Usage Tracking", () => {
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

	function insertAd(ad: GeneratedAd) {
		db.insert(schema.generatedAds)
			.values({
				id: ad.id,
				briefId: ad.briefId,
				primaryText: ad.primaryText,
				headline: ad.headline,
				description: ad.description,
				callToAction: ad.callToAction,
				model: ad.metadata.model,
				promptTokens: ad.metadata.promptTokens,
				completionTokens: ad.metadata.completionTokens,
				latencyMs: ad.metadata.latencyMs,
				iteration: ad.iteration,
				status: ad.status,
				createdAt: ad.createdAt,
			})
			.run();
	}

	it("records token_usage when generate returns tokens", async () => {
		const briefId = nanoid();
		insertBrief(briefId);

		const nodes = createNodes(db, {
			generateLlm: createMockGenerateLlm(),
		});

		const baseState: AdPipelineStateType = {
			brief: mockBrief,
			briefId,
			config: mockConfig,
			currentAd: null,
			evaluations: [],
			iterationCount: 0,
			maxIterations: 3,
			weakestDimension: null,
			tokenUsage: [],
			status: "pending",
			campaignPrompt: null,
		};

		await nodes.generate(baseState);

		const usageRows = db.select().from(schema.tokenUsage).all();
		const genUsage = usageRows.filter((r) => r.operation === "generate");
		expect(genUsage).toHaveLength(1);
		expect(genUsage[0]?.totalTokens).toBe(300);
		expect(genUsage[0]?.promptTokens).toBe(200);
		expect(genUsage[0]?.completionTokens).toBe(100);
		expect(genUsage[0]?.costUsd).toBeGreaterThan(0);
	});

	it("skips token_usage insert when generate returns 0 tokens", async () => {
		const briefId = nanoid();
		insertBrief(briefId);

		const nodes = createNodes(db, {
			generateLlm: createMockGenerateLlmNoTokens(),
		});

		const baseState: AdPipelineStateType = {
			brief: mockBrief,
			briefId,
			config: mockConfig,
			currentAd: null,
			evaluations: [],
			iterationCount: 0,
			maxIterations: 3,
			weakestDimension: null,
			tokenUsage: [],
			status: "pending",
			campaignPrompt: null,
		};

		await nodes.generate(baseState);

		const usageRows = db.select().from(schema.tokenUsage).all();
		expect(usageRows).toHaveLength(0);
	});

	it("inserts token_usage record after evaluate with tokens", async () => {
		const briefId = nanoid();
		const adId = nanoid();
		insertBrief(briefId);

		const mockAd: GeneratedAd = {
			id: adId,
			briefId,
			primaryText: "Test ad text",
			headline: "Test Headline",
			description: "Test description",
			callToAction: "Get Started",
			metadata: {
				model: "google/gemini-2.0-flash-001",
				tokens: 200,
				promptTokens: 120,
				completionTokens: 80,
				latencyMs: 100,
			},
			iteration: 1,
			status: "generating",
			createdAt: new Date().toISOString(),
		};

		insertAd(mockAd);

		const nodes = createNodes(db, {
			evaluateLlm: createMockEvaluateLlmWithTokens(8),
		});

		const stateWithAd: AdPipelineStateType = {
			brief: mockBrief,
			briefId,
			config: mockConfig,
			currentAd: mockAd,
			evaluations: [],
			iterationCount: 1,
			maxIterations: 3,
			weakestDimension: null,
			tokenUsage: [],
			status: "iterating",
			campaignPrompt: null,
		};

		await nodes.evaluate(stateWithAd);

		const usageRows = db.select().from(schema.tokenUsage).all();
		const evalUsage = usageRows.filter((r) => r.operation === "evaluate");
		expect(evalUsage).toHaveLength(1);
		expect(evalUsage[0]?.totalTokens).toBe(500);
		// Now uses actual promptTokens/completionTokens from tokensUsed
		expect(evalUsage[0]?.promptTokens).toBe(350);
		expect(evalUsage[0]?.completionTokens).toBe(150);
		expect(evalUsage[0]?.costUsd).toBeGreaterThan(0);
	});

	it("stores promptTokens and completionTokens in generated_ads", async () => {
		const briefId = nanoid();
		insertBrief(briefId);

		const nodes = createNodes(db, {
			generateLlm: createMockGenerateLlm(),
		});

		const baseState: AdPipelineStateType = {
			brief: mockBrief,
			briefId,
			config: mockConfig,
			currentAd: null,
			evaluations: [],
			iterationCount: 0,
			maxIterations: 3,
			weakestDimension: null,
			tokenUsage: [],
			status: "pending",
			campaignPrompt: null,
		};

		await nodes.generate(baseState);

		const ads = db.select().from(schema.generatedAds).all();
		expect(ads).toHaveLength(1);
		// With includeRaw mock, tokens are extracted from response_metadata
		expect(ads[0]?.promptTokens).toBe(200);
		expect(ads[0]?.completionTokens).toBe(100);
	});
});
