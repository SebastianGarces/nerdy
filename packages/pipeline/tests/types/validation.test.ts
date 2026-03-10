import { describe, expect, test } from "bun:test";
import {
	AdBriefSchema,
	DimensionScoreSchema,
	EvaluationOutputSchema,
	GeneratedAdOutputSchema,
} from "../../src/types/index.js";

const validBrief = {
	audience: "parent" as const,
	product: "Math Tutoring App",
	campaignGoal: "conversion" as const,
	emotionalAngle: "aspiration" as const,
	hookStyle: "question" as const,
	bodyPattern: "problem-agitate-solution" as const,
	offerType: "Free Trial",
	brandVoice: ["friendly", "encouraging"],
};

describe("AdBriefSchema", () => {
	test("accepts valid brief", () => {
		const result = AdBriefSchema.safeParse(validBrief);
		expect(result.success).toBe(true);
	});

	test("rejects invalid audience", () => {
		const result = AdBriefSchema.safeParse({
			...validBrief,
			audience: "invalid",
		});
		expect(result.success).toBe(false);
	});

	test("rejects missing product", () => {
		const { product: _, ...rest } = validBrief;
		const result = AdBriefSchema.safeParse(rest);
		expect(result.success).toBe(false);
	});

	test("rejects empty brandVoice array", () => {
		const result = AdBriefSchema.safeParse({
			...validBrief,
			brandVoice: [],
		});
		expect(result.success).toBe(false);
	});

	test("rejects invalid campaignGoal", () => {
		const result = AdBriefSchema.safeParse({
			...validBrief,
			campaignGoal: "branding",
		});
		expect(result.success).toBe(false);
	});

	test("rejects invalid emotionalAngle", () => {
		const result = AdBriefSchema.safeParse({
			...validBrief,
			emotionalAngle: "happiness",
		});
		expect(result.success).toBe(false);
	});
});

describe("DimensionScoreSchema", () => {
	test("accepts valid score", () => {
		const result = DimensionScoreSchema.safeParse({
			dimension: "clarity",
			score: 7,
			rationale: "Clear messaging",
		});
		expect(result.success).toBe(true);
	});

	test("rejects score below 1", () => {
		const result = DimensionScoreSchema.safeParse({
			dimension: "clarity",
			score: 0,
			rationale: "Too low",
		});
		expect(result.success).toBe(false);
	});

	test("rejects score above 10", () => {
		const result = DimensionScoreSchema.safeParse({
			dimension: "clarity",
			score: 11,
			rationale: "Too high",
		});
		expect(result.success).toBe(false);
	});

	test("rejects non-integer score", () => {
		const result = DimensionScoreSchema.safeParse({
			dimension: "clarity",
			score: 7.5,
			rationale: "Not integer",
		});
		expect(result.success).toBe(false);
	});

	test("rejects invalid dimension", () => {
		const result = DimensionScoreSchema.safeParse({
			dimension: "creativity",
			score: 5,
			rationale: "Invalid dimension",
		});
		expect(result.success).toBe(false);
	});

	test("rejects empty rationale", () => {
		const result = DimensionScoreSchema.safeParse({
			dimension: "clarity",
			score: 5,
			rationale: "",
		});
		expect(result.success).toBe(false);
	});
});

describe("EvaluationOutputSchema", () => {
	const makeDimensions = () => [
		{ dimension: "clarity" as const, score: 8, rationale: "Clear" },
		{
			dimension: "valueProposition" as const,
			score: 7,
			rationale: "Good value",
		},
		{ dimension: "callToAction" as const, score: 6, rationale: "OK CTA" },
		{
			dimension: "brandVoice" as const,
			score: 9,
			rationale: "On brand",
		},
		{
			dimension: "emotionalResonance" as const,
			score: 7,
			rationale: "Resonant",
		},
	];

	test("accepts valid evaluation output", () => {
		const result = EvaluationOutputSchema.safeParse({
			dimensions: makeDimensions(),
			confidence: 0.85,
		});
		expect(result.success).toBe(true);
	});

	test("rejects fewer than 5 dimensions", () => {
		const result = EvaluationOutputSchema.safeParse({
			dimensions: makeDimensions().slice(0, 4),
			confidence: 0.85,
		});
		expect(result.success).toBe(false);
	});

	test("rejects confidence above 1", () => {
		const result = EvaluationOutputSchema.safeParse({
			dimensions: makeDimensions(),
			confidence: 1.5,
		});
		expect(result.success).toBe(false);
	});

	test("rejects negative confidence", () => {
		const result = EvaluationOutputSchema.safeParse({
			dimensions: makeDimensions(),
			confidence: -0.1,
		});
		expect(result.success).toBe(false);
	});
});

describe("GeneratedAdOutputSchema", () => {
	test("accepts valid ad output", () => {
		const result = GeneratedAdOutputSchema.safeParse({
			primaryText: "Boost your child's math scores",
			headline: "Math Made Easy",
			description: "AI-powered tutoring for K-12",
			callToAction: "Start Free Trial",
		});
		expect(result.success).toBe(true);
	});

	test("rejects missing primaryText", () => {
		const result = GeneratedAdOutputSchema.safeParse({
			headline: "Math Made Easy",
			description: "AI-powered tutoring for K-12",
			callToAction: "Start Free Trial",
		});
		expect(result.success).toBe(false);
	});

	test("rejects empty headline", () => {
		const result = GeneratedAdOutputSchema.safeParse({
			primaryText: "Boost your child's math scores",
			headline: "",
			description: "AI-powered tutoring for K-12",
			callToAction: "Start Free Trial",
		});
		expect(result.success).toBe(false);
	});
});
