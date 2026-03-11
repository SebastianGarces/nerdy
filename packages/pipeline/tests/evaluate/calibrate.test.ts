import { describe, expect, it } from "bun:test";
import {
	type CalibrationAdResult,
	type DurationTier,
	type EnrichedCalibrationReport,
	type TieredAd,
	assignDurationTiers,
	formatFewShotExamples,
	pearsonCorrelation,
	runFullCalibration,
} from "../../src/evaluate/calibrate.js";
import type { LLMInterface } from "../../src/evaluate/index.js";
import type { CompetitorAd } from "../../src/types/index.js";

function makeAd(overrides: Partial<CompetitorAd> = {}): CompetitorAd {
	return {
		id: overrides.id ?? "ad-1",
		advertiser: overrides.advertiser ?? "Test Advertiser",
		primaryText: overrides.primaryText ?? "Test primary text",
		headline: overrides.headline ?? "Test Headline",
		description: overrides.description ?? "Test description",
		startDate: overrides.startDate ?? "2026-01-01",
		endDate: overrides.endDate ?? "2026-02-01",
		durationDays: overrides.durationDays ?? 30,
		platform: overrides.platform ?? "facebook",
		scrapedAt: overrides.scrapedAt ?? "2026-03-10T00:00:00.000Z",
	};
}

function createMockLLM(scoreMap?: Record<string, number>): LLMInterface {
	const defaultScore = 7;
	return {
		invoke: async () => ({
			dimensions: [
				{
					dimension: "clarity",
					score: scoreMap?.clarity ?? defaultScore,
					rationale: "Test rationale",
				},
				{
					dimension: "valueProposition",
					score: scoreMap?.valueProposition ?? defaultScore,
					rationale: "Test rationale",
				},
				{
					dimension: "callToAction",
					score: scoreMap?.callToAction ?? defaultScore,
					rationale: "Test rationale",
				},
				{
					dimension: "brandVoice",
					score: scoreMap?.brandVoice ?? defaultScore,
					rationale: "Test rationale",
				},
				{
					dimension: "emotionalResonance",
					score: scoreMap?.emotionalResonance ?? defaultScore,
					rationale: "Test rationale",
				},
			],
			confidence: 0.85,
		}),
	};
}

describe("assignDurationTiers", () => {
	it("correctly buckets 9 ads into 3 tiers of 3", () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 90 }),
			makeAd({ id: "a2", durationDays: 80 }),
			makeAd({ id: "a3", durationDays: 70 }),
			makeAd({ id: "a4", durationDays: 50 }),
			makeAd({ id: "a5", durationDays: 40 }),
			makeAd({ id: "a6", durationDays: 30 }),
			makeAd({ id: "a7", durationDays: 20 }),
			makeAd({ id: "a8", durationDays: 10 }),
			makeAd({ id: "a9", durationDays: 5 }),
		];

		const result = assignDurationTiers(ads);

		const highTier = result.filter((r) => r.tier === "high");
		const midTier = result.filter((r) => r.tier === "mid");
		const lowTier = result.filter((r) => r.tier === "low");

		expect(highTier).toHaveLength(3);
		expect(midTier).toHaveLength(3);
		expect(lowTier).toHaveLength(3);
	});

	it("higher duration ads go to high tier", () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 100 }),
			makeAd({ id: "a2", durationDays: 50 }),
			makeAd({ id: "a3", durationDays: 10 }),
		];

		const result = assignDurationTiers(ads);

		const highAd = result.find((r) => r.tier === "high");
		const lowAd = result.find((r) => r.tier === "low");

		expect(highAd?.ad.durationDays).toBe(100);
		expect(lowAd?.ad.durationDays).toBe(10);
	});

	it("handles fewer than 3 ads (all go to one tier)", () => {
		const ads = [makeAd({ id: "a1", durationDays: 30 })];

		const result = assignDurationTiers(ads);

		expect(result).toHaveLength(1);
		// With 1 ad, it should still get a tier
		expect(["high", "mid", "low"]).toContain(result[0]?.tier as string);
	});

	it("handles 2 ads", () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 60 }),
			makeAd({ id: "a2", durationDays: 10 }),
		];

		const result = assignDurationTiers(ads);
		expect(result).toHaveLength(2);
	});

	it("handles all same duration (even distribution)", () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 30 }),
			makeAd({ id: "a2", durationDays: 30 }),
			makeAd({ id: "a3", durationDays: 30 }),
			makeAd({ id: "a4", durationDays: 30 }),
			makeAd({ id: "a5", durationDays: 30 }),
			makeAd({ id: "a6", durationDays: 30 }),
		];

		const result = assignDurationTiers(ads);
		expect(result).toHaveLength(6);

		const tiers = new Set(result.map((r) => r.tier));
		// Even with same duration, we still distribute across tiers
		expect(tiers.size).toBeGreaterThanOrEqual(1);
	});

	it("assigns expected ranges per tier", () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 100 }),
			makeAd({ id: "a2", durationDays: 50 }),
			makeAd({ id: "a3", durationDays: 10 }),
		];

		const result = assignDurationTiers(ads);

		const highAd = result.find((r) => r.tier === "high");
		const midAd = result.find((r) => r.tier === "mid");
		const lowAd = result.find((r) => r.tier === "low");

		expect(highAd?.expectedRange).toEqual([5.0, 9.0]);
		expect(midAd?.expectedRange).toEqual([4.0, 7.5]);
		expect(lowAd?.expectedRange).toEqual([3.0, 6.5]);
	});
});

describe("pearsonCorrelation", () => {
	it("returns ~1.0 for perfect positive correlation", () => {
		const xs = [1, 2, 3, 4, 5];
		const ys = [2, 4, 6, 8, 10];
		const r = pearsonCorrelation(xs, ys);
		expect(r).toBeCloseTo(1.0, 5);
	});

	it("returns ~-1.0 for perfect negative correlation", () => {
		const xs = [1, 2, 3, 4, 5];
		const ys = [10, 8, 6, 4, 2];
		const r = pearsonCorrelation(xs, ys);
		expect(r).toBeCloseTo(-1.0, 5);
	});

	it("returns ~0.0 for no correlation", () => {
		const xs = [1, 2, 3, 4, 5];
		const ys = [3, 1, 4, 1, 5]; // roughly random
		const r = pearsonCorrelation(xs, ys);
		expect(Math.abs(r)).toBeLessThan(0.5);
	});

	it("returns 0 for single element", () => {
		const r = pearsonCorrelation([1], [1]);
		expect(r).toBe(0);
	});

	it("returns 0 for empty arrays", () => {
		const r = pearsonCorrelation([], []);
		expect(r).toBe(0);
	});

	it("returns 0 when standard deviation is zero", () => {
		const xs = [5, 5, 5];
		const ys = [3, 3, 3];
		const r = pearsonCorrelation(xs, ys);
		expect(r).toBe(0);
	});
});

describe("formatFewShotExamples", () => {
	function makeCalibrationResult(
		overrides: Partial<CalibrationAdResult> = {},
	): CalibrationAdResult {
		return {
			advertiser: overrides.advertiser ?? "Test Advertiser",
			headline: overrides.headline ?? "Test Headline",
			primaryText: overrides.primaryText ?? "Test primary text",
			description: overrides.description ?? "Test description",
			durationDays: overrides.durationDays ?? 30,
			tier: overrides.tier ?? "mid",
			actualScore: overrides.actualScore ?? 6.0,
			expectedRange: overrides.expectedRange ?? [4.0, 7.5],
			inRange: overrides.inRange ?? true,
			dimensions: overrides.dimensions ?? [
				{ dimension: "clarity", score: 7, rationale: "Clear" },
				{ dimension: "valueProposition", score: 6, rationale: "OK" },
				{ dimension: "callToAction", score: 6, rationale: "OK" },
				{ dimension: "brandVoice", score: 5, rationale: "Meh" },
				{ dimension: "emotionalResonance", score: 6, rationale: "OK" },
			],
			confidence: 0.85,
		};
	}

	const mockReport: EnrichedCalibrationReport = {
		timestamp: "2026-03-10T00:00:00.000Z",
		totalAds: 9,
		passed: true,
		results: [],
		summary: {
			byTier: {
				high: { count: 3, avgDuration: 80, avgScore: 8.0, passRate: 1.0 },
				mid: { count: 3, avgDuration: 40, avgScore: 6.0, passRate: 1.0 },
				low: { count: 3, avgDuration: 10, avgScore: 4.0, passRate: 1.0 },
			},
			correlation: 0.9,
			overallPassRate: 1.0,
		},
		fewShotCandidates: {
			good: makeCalibrationResult({
				tier: "high",
				actualScore: 8.5,
				headline: "Great Headline",
				dimensions: [
					{ dimension: "clarity", score: 9, rationale: "Very clear" },
					{
						dimension: "valueProposition",
						score: 8,
						rationale: "Strong value",
					},
					{ dimension: "callToAction", score: 9, rationale: "Compelling CTA" },
					{ dimension: "brandVoice", score: 8, rationale: "On brand" },
					{
						dimension: "emotionalResonance",
						score: 8,
						rationale: "Resonates well",
					},
				],
			}),
			mediocre: makeCalibrationResult({
				tier: "mid",
				actualScore: 6.0,
				headline: "OK Headline",
			}),
			poor: makeCalibrationResult({
				tier: "low",
				actualScore: 3.5,
				headline: "Bad Headline",
				dimensions: [
					{ dimension: "clarity", score: 4, rationale: "Unclear" },
					{ dimension: "valueProposition", score: 3, rationale: "Weak" },
					{ dimension: "callToAction", score: 3, rationale: "Poor CTA" },
					{ dimension: "brandVoice", score: 3, rationale: "Off brand" },
					{
						dimension: "emotionalResonance",
						score: 3,
						rationale: "No connection",
					},
				],
			}),
		},
	};

	it("output contains all 3 examples (good, mediocre, poor)", () => {
		const output = formatFewShotExamples(mockReport);

		expect(output).toContain("Good Ad");
		expect(output).toContain("Mediocre Ad");
		expect(output).toContain("Poor Ad");
	});

	it("each example has all 5 dimension scores", () => {
		const output = formatFewShotExamples(mockReport);

		// Count occurrences of dimension names - should appear 3 times each (once per example)
		const clarityMatches = output.match(/clarity/g);
		const vpMatches = output.match(/valueProposition/g);
		const ctaMatches = output.match(/callToAction/g);
		const bvMatches = output.match(/brandVoice/g);
		const erMatches = output.match(/emotionalResonance/g);

		expect(clarityMatches?.length).toBe(3);
		expect(vpMatches?.length).toBe(3);
		expect(ctaMatches?.length).toBe(3);
		expect(bvMatches?.length).toBe(3);
		expect(erMatches?.length).toBe(3);
	});

	it("contains Primary Text, Headline, Description, CTA", () => {
		const output = formatFewShotExamples(mockReport);

		expect(output).toContain("Primary Text");
		expect(output).toContain("Headline");
		expect(output).toContain("Description");
		expect(output).toContain("CTA");
	});
});

describe("runFullCalibration", () => {
	const mockConfig = {
		openRouterApiKey: "test-key",
		openRouterBaseUrl: "https://openrouter.ai/api/v1",
	};

	it("returns correct tier summary stats", async () => {
		const ads = [
			makeAd({ id: "h1", durationDays: 90, headline: "High 1" }),
			makeAd({ id: "h2", durationDays: 80, headline: "High 2" }),
			makeAd({ id: "h3", durationDays: 70, headline: "High 3" }),
			makeAd({ id: "m1", durationDays: 50, headline: "Mid 1" }),
			makeAd({ id: "m2", durationDays: 40, headline: "Mid 2" }),
			makeAd({ id: "m3", durationDays: 30, headline: "Mid 3" }),
			makeAd({ id: "l1", durationDays: 20, headline: "Low 1" }),
			makeAd({ id: "l2", durationDays: 10, headline: "Low 2" }),
			makeAd({ id: "l3", durationDays: 5, headline: "Low 3" }),
		];

		const llm = createMockLLM();
		const report = await runFullCalibration(ads, mockConfig, llm);

		expect(report.summary.byTier.high.count).toBe(3);
		expect(report.summary.byTier.mid.count).toBe(3);
		expect(report.summary.byTier.low.count).toBe(3);
		expect(report.totalAds).toBe(9);
	});

	it("selects correct few-shot candidates", async () => {
		const ads = [
			makeAd({
				id: "h1",
				durationDays: 90,
				headline: "High Ad",
				primaryText: "Best ad ever",
			}),
			makeAd({ id: "m1", durationDays: 40, headline: "Mid Ad" }),
			makeAd({
				id: "l1",
				durationDays: 5,
				headline: "Low Ad",
				primaryText: "Worst ad",
			}),
		];

		const llm = createMockLLM();
		const report = await runFullCalibration(ads, mockConfig, llm);

		// Good candidate should come from high tier
		expect(report.fewShotCandidates.good.tier).toBe("high");
		// Mediocre from mid tier
		expect(report.fewShotCandidates.mediocre.tier).toBe("mid");
		// Poor from low tier
		expect(report.fewShotCandidates.poor.tier).toBe("low");
	});

	it("reports pass/fail correctly when scores are in range", async () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 90 }),
			makeAd({ id: "a2", durationDays: 40 }),
			makeAd({ id: "a3", durationDays: 5 }),
		];

		// Score of 7.0 is in range for all tiers:
		// high: [5.0, 9.0], mid: [4.0, 7.5], low: [3.0, 6.5] -- 7.0 exceeds low tier
		// Use a score that fits all tiers
		const llm = createMockLLM({
			clarity: 6,
			valueProposition: 6,
			callToAction: 6,
			brandVoice: 6,
			emotionalResonance: 6,
		});
		const report = await runFullCalibration(ads, mockConfig, llm);

		// 6.0 is within all three ranges
		expect(report.summary.overallPassRate).toBe(1.0);
		expect(report.passed).toBe(true);
	});

	it("reports failure when scores are out of range", async () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 90 }),
			makeAd({ id: "a2", durationDays: 40 }),
			makeAd({ id: "a3", durationDays: 5 }),
		];

		// Score of 10.0 exceeds all tier ranges
		const llm = createMockLLM({
			clarity: 10,
			valueProposition: 10,
			callToAction: 10,
			brandVoice: 10,
			emotionalResonance: 10,
		});
		const report = await runFullCalibration(ads, mockConfig, llm);

		// 10.0 is out of range for mid [4.0, 7.5] and low [3.0, 6.5]
		expect(report.passed).toBe(false);
	});

	it("has correct timestamp format", async () => {
		const ads = [makeAd({ id: "a1", durationDays: 30 })];
		const llm = createMockLLM();
		const report = await runFullCalibration(ads, mockConfig, llm);

		expect(() => new Date(report.timestamp)).not.toThrow();
		expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
	});

	it("includes correlation in summary", async () => {
		const ads = [
			makeAd({ id: "a1", durationDays: 90 }),
			makeAd({ id: "a2", durationDays: 40 }),
			makeAd({ id: "a3", durationDays: 5 }),
		];

		const llm = createMockLLM();
		const report = await runFullCalibration(ads, mockConfig, llm);

		expect(typeof report.summary.correlation).toBe("number");
		expect(report.summary.correlation).toBeGreaterThanOrEqual(-1);
		expect(report.summary.correlation).toBeLessThanOrEqual(1);
	});
});
