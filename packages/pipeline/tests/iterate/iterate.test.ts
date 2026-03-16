import { describe, expect, it } from "bun:test";
import { DIMENSION_WEIGHTS } from "../../src/evaluate/index.js";
import { diagnoseWeakness, shouldRetry } from "../../src/iterate/index.js";
import type {
	AdGraphState,
	DimensionScore,
	Evaluation,
	EvaluationDimension,
} from "../../src/types/index.js";

function makeEvaluation(
	scores: Record<EvaluationDimension, number>,
): Evaluation {
	const dimensions: DimensionScore[] = Object.entries(scores).map(
		([dimension, score]) => ({
			dimension: dimension as EvaluationDimension,
			score,
			rationale: `Score for ${dimension}`,
		}),
	);

	return {
		id: "eval-1",
		adId: "ad-1",
		dimensions,
		weightedScore: 5.0,
		confidence: 0.8,
		model: "test-model",
		tokensUsed: 100,
		createdAt: new Date().toISOString(),
	};
}

function makeState(overrides: Partial<AdGraphState> = {}): AdGraphState {
	return {
		brief: {
			audience: "parent",
			product: "Test Product",
			campaignGoal: "conversion",
			emotionalAngle: "aspiration",
			hookStyle: "question",
			bodyPattern: "problem-agitate-solution",
			offerType: "Free trial",
			brandVoice: ["friendly"],
		},
		currentAd: null,
		evaluations: [],
		iterationCount: 1,
		maxIterations: 3,
		weakestDimension: null,
		tokenUsage: [],
		status: "iterating",
		...overrides,
	};
}

describe("diagnoseWeakness", () => {
	it("returns the dimension with the lowest score", () => {
		const evaluation = makeEvaluation({
			clarity: 8,
			valueProposition: 6,
			callToAction: 4,
			brandVoice: 7,
			emotionalResonance: 9,
		});

		expect(diagnoseWeakness(evaluation)).toBe("callToAction");
	});

	it("breaks ties using weight (higher weight returned first)", () => {
		// valueProposition weight = 0.25, clarity weight = 0.2
		// Both score 5, but valueProposition has higher weight
		const evaluation = makeEvaluation({
			clarity: 5,
			valueProposition: 5,
			callToAction: 8,
			brandVoice: 7,
			emotionalResonance: 9,
		});

		const result = diagnoseWeakness(evaluation);
		expect(result).toBe("valueProposition");

		// Verify our assumption about weights
		expect(DIMENSION_WEIGHTS.valueProposition).toBeGreaterThan(
			DIMENSION_WEIGHTS.clarity,
		);
	});

	it("returns the single lowest even when others are equal", () => {
		const evaluation = makeEvaluation({
			clarity: 7,
			valueProposition: 7,
			callToAction: 7,
			brandVoice: 3,
			emotionalResonance: 7,
		});

		expect(diagnoseWeakness(evaluation)).toBe("brandVoice");
	});
});

describe("shouldRetry", () => {
	it("returns true when iterationCount < maxIterations and status is iterating", () => {
		const state = makeState({
			iterationCount: 1,
			maxIterations: 3,
			status: "iterating",
		});

		expect(shouldRetry(state)).toBe(true);
	});

	it("returns false when iterationCount >= maxIterations", () => {
		const state = makeState({
			iterationCount: 3,
			maxIterations: 3,
			status: "iterating",
		});

		expect(shouldRetry(state)).toBe(false);
	});

	it("returns false when status is not iterating", () => {
		const state = makeState({
			iterationCount: 1,
			maxIterations: 3,
			status: "approved",
		});

		expect(shouldRetry(state)).toBe(false);
	});

	it("returns false when status is pending", () => {
		const state = makeState({
			iterationCount: 0,
			maxIterations: 3,
			status: "pending",
		});

		expect(shouldRetry(state)).toBe(false);
	});

	it("returns false when status is discarded", () => {
		const state = makeState({
			iterationCount: 2,
			maxIterations: 3,
			status: "discarded",
		});

		expect(shouldRetry(state)).toBe(false);
	});
});
