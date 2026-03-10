import { describe, expect, it } from "bun:test";
import {
	EVALUATION_SYSTEM_PROMPT,
	buildEvaluationPrompt,
} from "../../src/evaluate/prompts.js";
import type { AdBrief, GeneratedAd } from "../../src/types/index.js";

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
	primaryText:
		"Unlock your child's math potential with expert 1-on-1 tutoring.",
	headline: "Math Tutoring That Works",
	description: "Personalized sessions tailored to your child's needs.",
	callToAction: "Book a Free Session",
	metadata: {
		model: "test-model",
		tokens: 100,
		promptTokens: 60,
		completionTokens: 40,
		latencyMs: 500,
	},
	iteration: 1,
	status: "generating",
	createdAt: new Date().toISOString(),
};

describe("EVALUATION_SYSTEM_PROMPT", () => {
	it("should be a non-empty string", () => {
		expect(typeof EVALUATION_SYSTEM_PROMPT).toBe("string");
		expect(EVALUATION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
	});

	it("should contain all dimension names", () => {
		expect(EVALUATION_SYSTEM_PROMPT).toContain("clarity");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("valueProposition");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("callToAction");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("brandVoice");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("emotionalResonance");
	});

	it("should contain scoring rubric numbers", () => {
		expect(EVALUATION_SYSTEM_PROMPT).toContain("1-3");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("4-6");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("7-8");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("9-10");
	});

	it("should contain brand voice guidelines", () => {
		expect(EVALUATION_SYSTEM_PROMPT).toContain("Empowering");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("Knowledgeable");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("Approachable");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("Results-focused");
	});

	it("should contain dimension weights", () => {
		expect(EVALUATION_SYSTEM_PROMPT).toContain("20%");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("25%");
		expect(EVALUATION_SYSTEM_PROMPT).toContain("15%");
	});
});

describe("buildEvaluationPrompt", () => {
	it("should include the ad's primaryText", () => {
		const result = buildEvaluationPrompt(mockAd, mockBrief);
		expect(result).toContain(mockAd.primaryText);
	});

	it("should include the ad's headline", () => {
		const result = buildEvaluationPrompt(mockAd, mockBrief);
		expect(result).toContain(mockAd.headline);
	});

	it("should include the brief's audience", () => {
		const result = buildEvaluationPrompt(mockAd, mockBrief);
		expect(result).toContain("parent");
	});

	it("should include the brief's product", () => {
		const result = buildEvaluationPrompt(mockAd, mockBrief);
		expect(result).toContain("1-on-1 Math Tutoring");
	});

	it("should include the ad's description and CTA", () => {
		const result = buildEvaluationPrompt(mockAd, mockBrief);
		expect(result).toContain(mockAd.description);
		expect(result).toContain(mockAd.callToAction);
	});

	it("should include brief context fields", () => {
		const result = buildEvaluationPrompt(mockAd, mockBrief);
		expect(result).toContain("conversion");
		expect(result).toContain("aspiration");
		expect(result).toContain("question");
		expect(result).toContain("problem-agitate-solution");
		expect(result).toContain("Free trial session");
		expect(result).toContain("empowering, knowledgeable");
	});
});
