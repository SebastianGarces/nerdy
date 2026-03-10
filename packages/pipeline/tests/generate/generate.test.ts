import { describe, expect, test } from "bun:test";
import type { ChatOpenAI } from "@langchain/openai";
import { generateAd } from "../../src/generate/index.js";
import type {
	AdBrief,
	Evaluation,
	GeneratedAd,
} from "../../src/types/index.js";

const MOCK_BRIEF: AdBrief = {
	audience: "parent",
	product: "Varsity Tutors",
	campaignGoal: "conversion",
	emotionalAngle: "aspiration",
	hookStyle: "question",
	bodyPattern: "problem-agitate-solution",
	offerType: "Free consultation",
	brandVoice: [
		"empowering",
		"knowledgeable",
		"approachable",
		"results-focused",
	],
};

const MOCK_CONFIG = {
	openRouterApiKey: "test-key",
	openRouterBaseUrl: "https://test.example.com/v1",
};

const MOCK_AD_OUTPUT = {
	primaryText:
		"Is your child struggling in school? Our expert tutors provide personalized 1-on-1 sessions that build confidence and improve grades. Join thousands of families who have transformed their child's academic journey.",
	headline: "Unlock Your Child's Full Potential Today",
	description:
		"Personalized tutoring from expert educators in every subject, K-12 through college.",
	callToAction: "Get Started",
};

function createMockLlm(): ChatOpenAI {
	const mock = {
		withStructuredOutput: () => ({
			invoke: async () => MOCK_AD_OUTPUT,
		}),
	} as unknown as ChatOpenAI;
	return mock;
}

function createMockLlmWithPromptCapture(): {
	llm: ChatOpenAI;
	getCapturedMessages: () => Array<{ role: string; content: string }>;
} {
	let capturedMessages: Array<{ role: string; content: string }> = [];
	const llm = {
		withStructuredOutput: () => ({
			invoke: async (messages: Array<{ role: string; content: string }>) => {
				capturedMessages = messages;
				return MOCK_AD_OUTPUT;
			},
		}),
	} as unknown as ChatOpenAI;
	return { llm, getCapturedMessages: () => capturedMessages };
}

const MOCK_EVALUATION: Evaluation = {
	id: "eval-1",
	adId: "prev-ad-id",
	dimensions: [
		{ dimension: "clarity", score: 8, rationale: "Clear and concise" },
		{
			dimension: "valueProposition",
			score: 5,
			rationale: "Weak value prop",
		},
		{
			dimension: "callToAction",
			score: 7,
			rationale: "Good CTA",
		},
		{
			dimension: "brandVoice",
			score: 6,
			rationale: "Mostly on brand",
		},
		{
			dimension: "emotionalResonance",
			score: 7,
			rationale: "Emotionally engaging",
		},
	],
	weightedScore: 6.6,
	confidence: 0.8,
	model: "test",
	tokensUsed: 200,
	createdAt: new Date().toISOString(),
};

const MOCK_PREVIOUS_AD: GeneratedAd = {
	id: "prev-ad-id",
	briefId: "brief-1",
	primaryText: "Old ad text",
	headline: "Old headline",
	description: "Old description",
	callToAction: "Learn More",
	metadata: { model: "test", tokens: 100, latencyMs: 500 },
	iteration: 1,
	status: "draft",
	createdAt: new Date().toISOString(),
};

describe("generateAd", () => {
	test("returns a valid GeneratedAd shape", async () => {
		const result = await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			llm: createMockLlm(),
		});

		expect(result.id).toBeString();
		expect(result.id.length).toBeGreaterThan(0);
		expect(result.briefId).toBeString();
		expect(result.primaryText).toBe(MOCK_AD_OUTPUT.primaryText);
		expect(result.headline).toBe(MOCK_AD_OUTPUT.headline);
		expect(result.description).toBe(MOCK_AD_OUTPUT.description);
		expect(result.callToAction).toBe(MOCK_AD_OUTPUT.callToAction);
		expect(result.status).toBe("draft");
		expect(result.iteration).toBe(1);
		expect(result.createdAt).toBeString();
		// Verify ISO date format
		expect(() => new Date(result.createdAt)).not.toThrow();
		expect(Number.isNaN(new Date(result.createdAt).getTime())).toBe(false);
	});

	test("uses provided briefId", async () => {
		const result = await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			briefId: "custom-brief-id",
			llm: createMockLlm(),
		});

		expect(result.briefId).toBe("custom-brief-id");
	});

	test("generates briefId if not provided", async () => {
		const result = await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			llm: createMockLlm(),
		});

		expect(result.briefId).toBeString();
		expect(result.briefId.length).toBeGreaterThan(0);
	});

	test("tracks latency in metadata", async () => {
		const result = await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			llm: createMockLlm(),
		});

		expect(result.metadata.latencyMs).toBeNumber();
		expect(result.metadata.latencyMs).toBeGreaterThanOrEqual(0);
	});

	test("records model name in metadata", async () => {
		const result = await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			llm: createMockLlm(),
		});

		expect(result.metadata.model).toBe("google/gemini-2.0-flash-001");
	});

	test("passes iteration count from context", async () => {
		const result = await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			context: {
				previousAd: MOCK_PREVIOUS_AD,
				evaluation: MOCK_EVALUATION,
				targetDimension: "valueProposition",
				iteration: 3,
			},
			llm: createMockLlm(),
		});

		expect(result.iteration).toBe(3);
	});

	test("regeneration includes evaluation context in prompt", async () => {
		const { llm, getCapturedMessages } = createMockLlmWithPromptCapture();

		await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			context: {
				previousAd: MOCK_PREVIOUS_AD,
				evaluation: MOCK_EVALUATION,
				targetDimension: "valueProposition",
				iteration: 2,
			},
			llm,
		});

		const messages = getCapturedMessages();
		expect(messages).toHaveLength(2);

		const userMessage = messages[1];
		expect(userMessage).toBeDefined();
		expect(userMessage?.content).toContain("Old ad text");
		expect(userMessage?.content).toContain("Old headline");
		expect(userMessage?.content).toContain("valueProposition");
		expect(userMessage?.content).toContain("Weak value prop");
		expect(userMessage?.content).toContain("WEAKEST DIMENSION");
	});

	test("generation prompt includes brief parameters", async () => {
		const { llm, getCapturedMessages } = createMockLlmWithPromptCapture();

		await generateAd({
			brief: MOCK_BRIEF,
			config: MOCK_CONFIG,
			llm,
		});

		const messages = getCapturedMessages();
		const userMessage = messages[1];
		expect(userMessage).toBeDefined();
		expect(userMessage?.content).toContain("parent");
		expect(userMessage?.content).toContain("conversion");
		expect(userMessage?.content).toContain("aspiration");
		expect(userMessage?.content).toContain("question");
		expect(userMessage?.content).toContain("problem-agitate-solution");
		expect(userMessage?.content).toContain("Free consultation");
	});

	test("each call produces a unique ad ID", async () => {
		const results = await Promise.all([
			generateAd({
				brief: MOCK_BRIEF,
				config: MOCK_CONFIG,
				llm: createMockLlm(),
			}),
			generateAd({
				brief: MOCK_BRIEF,
				config: MOCK_CONFIG,
				llm: createMockLlm(),
			}),
			generateAd({
				brief: MOCK_BRIEF,
				config: MOCK_CONFIG,
				llm: createMockLlm(),
			}),
		]);

		const ids = new Set(results.map((r) => r.id));
		expect(ids.size).toBe(3);
	});
});
