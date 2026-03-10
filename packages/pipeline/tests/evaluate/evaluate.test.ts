import { describe, expect, it } from "bun:test";
import {
	DIMENSION_WEIGHTS,
	type LLMInterface,
	calculateWeightedScore,
	evaluateAd,
} from "../../src/evaluate/index.js";
import type {
	AdBrief,
	GeneratedAd,
	PipelineConfig,
} from "../../src/types/index.js";

const mockConfig: PipelineConfig = {
	openRouterApiKey: "test-key",
	openRouterBaseUrl: "https://openrouter.ai/api/v1",
	databaseUrl: ":memory:",
};

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

const mockAd: GeneratedAd = {
	id: "ad-123",
	briefId: "brief-456",
	primaryText: "Unlock your child's math potential.",
	headline: "Math Tutoring That Works",
	description: "Personalized sessions.",
	callToAction: "Book a Free Session",
	metadata: { model: "test-model", tokens: 100, latencyMs: 500 },
	iteration: 1,
	status: "draft",
	createdAt: new Date().toISOString(),
};

function createMockLLM(
	response: Awaited<ReturnType<LLMInterface["invoke"]>>,
): LLMInterface {
	return {
		invoke: async () => response,
	};
}

describe("DIMENSION_WEIGHTS", () => {
	it("should have all 5 dimensions", () => {
		expect(Object.keys(DIMENSION_WEIGHTS)).toHaveLength(5);
		expect(DIMENSION_WEIGHTS.clarity).toBe(0.2);
		expect(DIMENSION_WEIGHTS.valueProposition).toBe(0.25);
		expect(DIMENSION_WEIGHTS.callToAction).toBe(0.2);
		expect(DIMENSION_WEIGHTS.brandVoice).toBe(0.15);
		expect(DIMENSION_WEIGHTS.emotionalResonance).toBe(0.2);
	});

	it("should sum to 1.0", () => {
		const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
		expect(sum).toBeCloseTo(1.0);
	});
});

describe("calculateWeightedScore", () => {
	it("should calculate correct weighted average when all scores are equal", () => {
		const dimensions = [
			{ dimension: "clarity" as const, score: 8, rationale: "Good" },
			{ dimension: "valueProposition" as const, score: 8, rationale: "Good" },
			{ dimension: "callToAction" as const, score: 8, rationale: "Good" },
			{ dimension: "brandVoice" as const, score: 8, rationale: "Good" },
			{ dimension: "emotionalResonance" as const, score: 8, rationale: "Good" },
		];
		expect(calculateWeightedScore(dimensions)).toBe(8.0);
	});

	it("should calculate correct weighted average with mixed scores", () => {
		const dimensions = [
			{ dimension: "clarity" as const, score: 10, rationale: "Excellent" },
			{ dimension: "valueProposition" as const, score: 6, rationale: "OK" },
			{ dimension: "callToAction" as const, score: 8, rationale: "Good" },
			{ dimension: "brandVoice" as const, score: 4, rationale: "Weak" },
			{
				dimension: "emotionalResonance" as const,
				score: 7,
				rationale: "Decent",
			},
		];
		// 10*0.20 + 6*0.25 + 8*0.20 + 4*0.15 + 7*0.20
		// = 2.0 + 1.5 + 1.6 + 0.6 + 1.4 = 7.1
		expect(calculateWeightedScore(dimensions)).toBe(7.1);
	});

	it("should return 1.0 when all scores are 1", () => {
		const dimensions = [
			{ dimension: "clarity" as const, score: 1, rationale: "Bad" },
			{ dimension: "valueProposition" as const, score: 1, rationale: "Bad" },
			{ dimension: "callToAction" as const, score: 1, rationale: "Bad" },
			{ dimension: "brandVoice" as const, score: 1, rationale: "Bad" },
			{ dimension: "emotionalResonance" as const, score: 1, rationale: "Bad" },
		];
		expect(calculateWeightedScore(dimensions)).toBe(1.0);
	});
});

describe("evaluateAd", () => {
	it("should return all 5 dimensions in the result", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 8, rationale: "Clear messaging" },
				{ dimension: "valueProposition", score: 7, rationale: "Good value" },
				{ dimension: "callToAction", score: 9, rationale: "Strong CTA" },
				{ dimension: "brandVoice", score: 6, rationale: "Mostly on-brand" },
				{
					dimension: "emotionalResonance",
					score: 8,
					rationale: "Resonates well",
				},
			],
			confidence: 0.85,
		};

		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.dimensions).toHaveLength(5);
		const dimensionNames = result.dimensions.map((d) => d.dimension);
		expect(dimensionNames).toContain("clarity");
		expect(dimensionNames).toContain("valueProposition");
		expect(dimensionNames).toContain("callToAction");
		expect(dimensionNames).toContain("brandVoice");
		expect(dimensionNames).toContain("emotionalResonance");
	});

	it("should calculate correct weighted score", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 10, rationale: "Clear" },
				{ dimension: "valueProposition", score: 6, rationale: "OK" },
				{ dimension: "callToAction", score: 8, rationale: "Good" },
				{ dimension: "brandVoice", score: 4, rationale: "Weak" },
				{ dimension: "emotionalResonance", score: 7, rationale: "Decent" },
			],
			confidence: 0.9,
		};

		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.weightedScore).toBe(7.1);
	});

	it("should pass through confidence from LLM output", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 7, rationale: "OK" },
				{ dimension: "valueProposition", score: 7, rationale: "OK" },
				{ dimension: "callToAction", score: 7, rationale: "OK" },
				{ dimension: "brandVoice", score: 7, rationale: "OK" },
				{ dimension: "emotionalResonance", score: 7, rationale: "OK" },
			],
			confidence: 0.72,
		};

		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.confidence).toBe(0.72);
	});

	it("should have a valid ID and ISO date", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 7, rationale: "OK" },
				{ dimension: "valueProposition", score: 7, rationale: "OK" },
				{ dimension: "callToAction", score: 7, rationale: "OK" },
				{ dimension: "brandVoice", score: 7, rationale: "OK" },
				{ dimension: "emotionalResonance", score: 7, rationale: "OK" },
			],
			confidence: 0.8,
		};

		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.id).toBeTruthy();
		expect(result.id.length).toBeGreaterThan(0);
		expect(result.createdAt).toBeTruthy();
		// ISO date format check
		expect(() => new Date(result.createdAt)).not.toThrow();
		expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
	});

	it("should set the correct adId", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 7, rationale: "OK" },
				{ dimension: "valueProposition", score: 7, rationale: "OK" },
				{ dimension: "callToAction", score: 7, rationale: "OK" },
				{ dimension: "brandVoice", score: 7, rationale: "OK" },
				{ dimension: "emotionalResonance", score: 7, rationale: "OK" },
			],
			confidence: 0.8,
		};

		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.adId).toBe("ad-123");
	});

	it("should return fallback evaluation when LLM fails twice", async () => {
		let callCount = 0;
		const failingLLM: LLMInterface = {
			invoke: async () => {
				callCount++;
				throw new Error("LLM unavailable");
			},
		};

		const result = await evaluateAd(mockAd, mockBrief, mockConfig, failingLLM);

		expect(callCount).toBe(2); // initial + retry
		expect(result.weightedScore).toBe(1.0);
		expect(result.confidence).toBe(0);
		expect(result.dimensions).toHaveLength(5);
		for (const dim of result.dimensions) {
			expect(dim.score).toBe(1);
			expect(dim.rationale).toBe("Evaluation failed");
		}
	});

	it("should return fallback when response is missing dimensions", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 8, rationale: "Good" },
				// Missing 4 dimensions
			],
			confidence: 0.9,
		} as Awaited<ReturnType<LLMInterface["invoke"]>>;

		// The mock returns data missing required dimensions
		// Since callToAction etc are missing, it should fallback
		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.weightedScore).toBe(1.0);
		expect(result.confidence).toBe(0);
	});

	it("should set model name on the result", async () => {
		const mockResponse = {
			dimensions: [
				{ dimension: "clarity", score: 7, rationale: "OK" },
				{ dimension: "valueProposition", score: 7, rationale: "OK" },
				{ dimension: "callToAction", score: 7, rationale: "OK" },
				{ dimension: "brandVoice", score: 7, rationale: "OK" },
				{ dimension: "emotionalResonance", score: 7, rationale: "OK" },
			],
			confidence: 0.8,
		};

		const result = await evaluateAd(
			mockAd,
			mockBrief,
			mockConfig,
			createMockLLM(mockResponse),
		);

		expect(result.model).toBe("google/gemini-2.0-flash-001");
	});
});
