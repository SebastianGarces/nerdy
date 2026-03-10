import { describe, expect, test } from "bun:test";
import type { ChatOpenAI } from "@langchain/openai";
import { promptToBriefs } from "../../src/generate/prompt-to-briefs.js";
import { type AdBrief, AdBriefSchema } from "../../src/types/index.js";

const MOCK_CONFIG = {
	openRouterApiKey: "test-key",
	openRouterBaseUrl: "https://test.example.com/v1",
	databaseUrl: ":memory:",
};

const mockBriefs: AdBrief[] = [
	{
		audience: "parent",
		product: "Varsity Tutors",
		campaignGoal: "conversion",
		emotionalAngle: "aspiration",
		hookStyle: "question",
		bodyPattern: "problem-agitate-solution",
		offerType: "Free consultation",
		brandVoice: ["empowering", "approachable"],
	},
	{
		audience: "student",
		product: "Varsity Tutors",
		campaignGoal: "awareness",
		emotionalAngle: "social-proof",
		hookStyle: "stat",
		bodyPattern: "testimonial-benefit",
		offerType: "First session free",
		brandVoice: ["knowledgeable", "results-focused"],
	},
	{
		audience: "family",
		product: "Varsity Tutors",
		campaignGoal: "conversion",
		emotionalAngle: "urgency",
		hookStyle: "fear",
		bodyPattern: "stat-context-offer",
		offerType: "14-day free trial",
		brandVoice: ["empowering", "knowledgeable", "approachable"],
	},
];

function createMockLlm(): ChatOpenAI {
	return {
		withStructuredOutput: () => ({
			invoke: async () => ({ briefs: mockBriefs }),
		}),
	} as unknown as ChatOpenAI;
}

function createFailingMockLlm(): ChatOpenAI {
	return {
		withStructuredOutput: () => ({
			invoke: async () => {
				throw new Error("LLM API error");
			},
		}),
	} as unknown as ChatOpenAI;
}

describe("promptToBriefs", () => {
	test("returns valid AdBrief[] from LLM", async () => {
		const result = await promptToBriefs(
			"Back to school campaign targeting parents",
			3,
			MOCK_CONFIG,
			{ llm: createMockLlm() },
		);

		expect(result).toHaveLength(3);
		for (const brief of result) {
			const parsed = AdBriefSchema.safeParse(brief);
			expect(parsed.success).toBe(true);
		}
	});

	test("falls back to matrix briefs on LLM failure", async () => {
		const result = await promptToBriefs(
			"Back to school campaign",
			3,
			MOCK_CONFIG,
			{ llm: createFailingMockLlm() },
		);

		expect(result).toHaveLength(3);
		for (const brief of result) {
			const parsed = AdBriefSchema.safeParse(brief);
			expect(parsed.success).toBe(true);
		}
	});

	test("respects count parameter", async () => {
		const result = await promptToBriefs(
			"Summer tutoring campaign",
			2,
			MOCK_CONFIG,
			{ llm: createMockLlm() },
		);

		expect(result).toHaveLength(2);
	});
});
