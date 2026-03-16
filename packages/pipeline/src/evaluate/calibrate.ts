import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
	AdBrief,
	CompetitorAd,
	DimensionScore,
	GeneratedAd,
	PipelineConfig,
} from "../types/index.js";
import {
	type LLMInterface,
	calculateWeightedScore,
	evaluateAd,
} from "./index.js";

// ── Existing types (backward compat) ──────────────────────────────────────

interface CalibrationEntry {
	ad: GeneratedAd;
	brief: AdBrief;
	expectedRange: [number, number];
}

interface CalibrationResult {
	expected: [number, number];
	actual: number;
	inRange: boolean;
}

interface CalibrationReport {
	passed: boolean;
	results: CalibrationResult[];
}

// ── New types ─────────────────────────────────────────────────────────────

export type DurationTier = "high" | "mid" | "low";

export interface TieredAd {
	ad: CompetitorAd;
	tier: DurationTier;
	expectedRange: [number, number];
}

export interface CalibrationAdResult {
	advertiser: string;
	headline: string;
	primaryText: string;
	description: string;
	durationDays: number;
	tier: DurationTier;
	actualScore: number;
	expectedRange: [number, number];
	inRange: boolean;
	dimensions: DimensionScore[];
	confidence: number;
}

export interface EnrichedCalibrationReport {
	timestamp: string;
	totalAds: number;
	passed: boolean;
	results: CalibrationAdResult[];
	summary: {
		byTier: Record<
			DurationTier,
			{ count: number; avgDuration: number; avgScore: number; passRate: number }
		>;
		correlation: number;
		overallPassRate: number;
	};
	fewShotCandidates: {
		good: CalibrationAdResult;
		mediocre: CalibrationAdResult;
		poor: CalibrationAdResult;
	};
}

// ── Expected ranges per tier ──────────────────────────────────────────────

const TIER_RANGES: Record<DurationTier, [number, number]> = {
	high: [5.0, 9.0],
	mid: [4.0, 7.5],
	low: [3.0, 6.5],
};

// ── Generic calibration brief ─────────────────────────────────────────────

const GENERIC_CALIBRATION_BRIEF: AdBrief = {
	audience: "parent",
	product: "online tutoring platform",
	campaignGoal: "conversion",
	emotionalAngle: "aspiration",
	hookStyle: "question",
	bodyPattern: "problem-agitate-solution",
	offerType: "Free session",
	brandVoice: ["professional", "approachable"],
};

// ── Existing functions (backward compat) ──────────────────────────────────

export async function calibrateEvaluator(
	referenceAds: CalibrationEntry[],
	config: PipelineConfig,
): Promise<CalibrationReport> {
	const results: CalibrationResult[] = [];

	for (const entry of referenceAds) {
		const evaluation = await evaluateAd(entry.ad, entry.brief, config);
		const actual = evaluation.weightedScore;
		const [min, max] = entry.expectedRange;
		const inRange = actual >= min && actual <= max;

		results.push({
			expected: entry.expectedRange,
			actual,
			inRange,
		});
	}

	const passed = results.every((r) => r.inRange);

	return { passed, results };
}

function competitorAdToGeneratedAd(ad: CompetitorAd): GeneratedAd {
	return {
		id: ad.id,
		briefId: "calibration",
		primaryText: ad.primaryText,
		headline: ad.headline,
		description: ad.description,
		callToAction: "Learn More",
		metadata: {
			model: "scraped",
			tokens: 0,
			promptTokens: 0,
			completionTokens: 0,
			latencyMs: 0,
		},
		iteration: 0,
		status: "approved",
		createdAt: ad.scrapedAt,
	};
}

const CALIBRATION_BRIEF: AdBrief = {
	audience: "parent",
	product: "Varsity Tutors",
	campaignGoal: "conversion",
	emotionalAngle: "aspiration",
	hookStyle: "question",
	bodyPattern: "problem-agitate-solution",
	offerType: "Free consultation",
	brandVoice: ["empowering", "knowledgeable"],
};

export async function calibrateFromCompetitorAds(
	ads: CompetitorAd[],
	config: PipelineConfig,
): Promise<CalibrationReport> {
	const entries: CalibrationEntry[] = ads.map((ad) => {
		const isVarsityTutors = ad.advertiser
			.toLowerCase()
			.includes("varsity tutors");
		const expectedRange: [number, number] = isVarsityTutors ? [6, 10] : [3, 8];

		return {
			ad: competitorAdToGeneratedAd(ad),
			brief: CALIBRATION_BRIEF,
			expectedRange,
		};
	});

	return calibrateEvaluator(entries, config);
}

// ── Duration-based tiering ────────────────────────────────────────────────

export function assignDurationTiers(ads: CompetitorAd[]): TieredAd[] {
	if (ads.length === 0) return [];

	// Sort by durationDays descending
	const sorted = [...ads].sort((a, b) => b.durationDays - a.durationDays);

	const tierSize = Math.max(1, Math.floor(sorted.length / 3));
	const result: TieredAd[] = [];

	for (let i = 0; i < sorted.length; i++) {
		const ad = sorted[i] as CompetitorAd;
		let tier: DurationTier;

		if (i < tierSize) {
			tier = "high";
		} else if (i < tierSize * 2) {
			tier = "mid";
		} else {
			tier = "low";
		}

		result.push({
			ad,
			tier,
			expectedRange: TIER_RANGES[tier],
		});
	}

	return result;
}

// ── Pearson correlation ───────────────────────────────────────────────────

export function pearsonCorrelation(xs: number[], ys: number[]): number {
	const n = xs.length;
	if (n <= 1) return 0;

	const meanX = xs.reduce((a, b) => a + b, 0) / n;
	const meanY = ys.reduce((a, b) => a + b, 0) / n;

	let sumXY = 0;
	let sumX2 = 0;
	let sumY2 = 0;

	for (let i = 0; i < n; i++) {
		const dx = (xs[i] as number) - meanX;
		const dy = (ys[i] as number) - meanY;
		sumXY += dx * dy;
		sumX2 += dx * dx;
		sumY2 += dy * dy;
	}

	const denom = Math.sqrt(sumX2 * sumY2);
	if (denom === 0) return 0;

	return sumXY / denom;
}

// ── Full calibration runner ───────────────────────────────────────────────

async function evaluateBatch(
	items: Array<{ ad: GeneratedAd; tiered: TieredAd }>,
	config: PipelineConfig,
	llm: LLMInterface | undefined,
): Promise<CalibrationAdResult[]> {
	const results: CalibrationAdResult[] = [];

	// Process in batches of 5
	const batchSize = 5;
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const promises = batch.map(async ({ ad, tiered }) => {
			const evaluation = await evaluateAd(
				ad,
				GENERIC_CALIBRATION_BRIEF,
				config,
				llm,
			);
			const [min, max] = tiered.expectedRange;
			const inRange =
				evaluation.weightedScore >= min && evaluation.weightedScore <= max;

			return {
				advertiser: tiered.ad.advertiser,
				headline: tiered.ad.headline,
				primaryText: tiered.ad.primaryText,
				description: tiered.ad.description,
				durationDays: tiered.ad.durationDays,
				tier: tiered.tier,
				actualScore: evaluation.weightedScore,
				expectedRange: tiered.expectedRange,
				inRange,
				dimensions: evaluation.dimensions,
				confidence: evaluation.confidence,
			} satisfies CalibrationAdResult;
		});

		const batchResults = await Promise.all(promises);
		results.push(...batchResults);
	}

	return results;
}

export async function runFullCalibration(
	ads: CompetitorAd[],
	config: PipelineConfig,
	llm?: LLMInterface,
): Promise<EnrichedCalibrationReport> {
	const tieredAds = assignDurationTiers(ads);

	const items = tieredAds.map((tiered) => ({
		ad: competitorAdToGeneratedAd(tiered.ad),
		tiered,
	}));

	const results = await evaluateBatch(items, config, llm);

	// Compute tier summaries
	const byTier = {} as Record<
		DurationTier,
		{ count: number; avgDuration: number; avgScore: number; passRate: number }
	>;

	for (const tier of ["high", "mid", "low"] as DurationTier[]) {
		const tierResults = results.filter((r) => r.tier === tier);
		const count = tierResults.length;

		if (count === 0) {
			byTier[tier] = { count: 0, avgDuration: 0, avgScore: 0, passRate: 0 };
			continue;
		}

		const avgDuration =
			tierResults.reduce((sum, r) => sum + r.durationDays, 0) / count;
		const avgScore =
			tierResults.reduce((sum, r) => sum + r.actualScore, 0) / count;
		const passRate = tierResults.filter((r) => r.inRange).length / count;

		byTier[tier] = {
			count,
			avgDuration: Math.round(avgDuration * 100) / 100,
			avgScore: Math.round(avgScore * 100) / 100,
			passRate: Math.round(passRate * 100) / 100,
		};
	}

	// Compute correlation
	const durations = results.map((r) => r.durationDays);
	const scores = results.map((r) => r.actualScore);
	const correlation = pearsonCorrelation(durations, scores);

	const overallPassRate =
		results.length > 0
			? Math.round(
					(results.filter((r) => r.inRange).length / results.length) * 100,
				) / 100
			: 0;

	const passed = results.every((r) => r.inRange);

	// Select few-shot candidates
	const fewShotCandidates = selectFewShotCandidates(results);

	return {
		timestamp: new Date().toISOString(),
		totalAds: ads.length,
		passed,
		results,
		summary: {
			byTier,
			correlation: Math.round(correlation * 1000) / 1000,
			overallPassRate,
		},
		fewShotCandidates,
	};
}

function selectFewShotCandidates(results: CalibrationAdResult[]): {
	good: CalibrationAdResult;
	mediocre: CalibrationAdResult;
	poor: CalibrationAdResult;
} {
	const highResults = results.filter((r) => r.tier === "high");
	const midResults = results.filter((r) => r.tier === "mid");
	const lowResults = results.filter((r) => r.tier === "low");

	// Good: highest score from high tier
	const good =
		highResults.length > 0
			? highResults.reduce((best, r) =>
					r.actualScore > best.actualScore ? r : best,
				)
			: results.reduce((best, r) =>
					r.actualScore > best.actualScore ? r : best,
				);

	// Mediocre: closest to 6.0 from mid tier
	const mediocre =
		midResults.length > 0
			? midResults.reduce((best, r) =>
					Math.abs(r.actualScore - 6.0) < Math.abs(best.actualScore - 6.0)
						? r
						: best,
				)
			: results.reduce((best, r) =>
					Math.abs(r.actualScore - 6.0) < Math.abs(best.actualScore - 6.0)
						? r
						: best,
				);

	// Poor: lowest score from low tier
	const poor =
		lowResults.length > 0
			? lowResults.reduce((best, r) =>
					r.actualScore < best.actualScore ? r : best,
				)
			: results.reduce((best, r) =>
					r.actualScore < best.actualScore ? r : best,
				);

	return {
		good: good as CalibrationAdResult,
		mediocre: mediocre as CalibrationAdResult,
		poor: poor as CalibrationAdResult,
	};
}

// ── Few-shot formatter ────────────────────────────────────────────────────

export function formatFewShotExamples(
	report: EnrichedCalibrationReport,
): string {
	const { good, mediocre, poor } = report.fewShotCandidates;

	const formatExample = (
		label: string,
		expectedScore: string,
		result: CalibrationAdResult,
	): string => {
		const dimLines = result.dimensions
			.map((d) => `- ${d.dimension}: ${d.score} — ${d.rationale}`)
			.join("\n");

		return `### ${label} (Expected Score ~${expectedScore})

**Brief**: Audience: parent | Product: online tutoring platform | Goal: conversion | Emotional Angle: aspiration
**Ad**:
- Primary Text: "${result.primaryText}"
- Headline: "${result.headline}"
- Description: "${result.description}"
- CTA: "Learn More"

**Evaluation**:
${dimLines}
- confidence: ${result.confidence}`;
	};

	return `## Few-Shot Examples

${formatExample("Example 1 — Good Ad", good.actualScore.toFixed(1), good)}

${formatExample("Example 2 — Mediocre Ad", mediocre.actualScore.toFixed(1), mediocre)}

${formatExample("Example 3 — Poor Ad", poor.actualScore.toFixed(1), poor)}`;
}

// ── Report writer ─────────────────────────────────────────────────────────

export function writeCalibrationReport(
	report: EnrichedCalibrationReport,
	outputDir: string,
): string {
	mkdirSync(outputDir, { recursive: true });

	const timestamp = report.timestamp.replace(/[:.]/g, "-").slice(0, 19);
	const filePath = resolve(outputDir, `${timestamp}-report.json`);

	writeFileSync(filePath, JSON.stringify(report, null, 2));

	// Print markdown summary to stderr
	const { byTier, correlation, overallPassRate } = report.summary;
	const table = [
		"| Tier | Count | Avg Duration | Avg Score | Pass Rate |",
		"|------|-------|-------------|-----------|-----------|",
		`| High | ${byTier.high.count} | ${byTier.high.avgDuration}d | ${byTier.high.avgScore} | ${(byTier.high.passRate * 100).toFixed(0)}% |`,
		`| Mid  | ${byTier.mid.count} | ${byTier.mid.avgDuration}d | ${byTier.mid.avgScore} | ${(byTier.mid.passRate * 100).toFixed(0)}% |`,
		`| Low  | ${byTier.low.count} | ${byTier.low.avgDuration}d | ${byTier.low.avgScore} | ${(byTier.low.passRate * 100).toFixed(0)}% |`,
	].join("\n");

	console.error("\n## Calibration Report\n");
	console.error(table);
	console.error(`\nCorrelation (duration vs score): ${correlation}`);
	console.error(`Overall pass rate: ${(overallPassRate * 100).toFixed(0)}%`);
	console.error(`Result: ${report.passed ? "PASSED" : "FAILED"}\n`);

	return filePath;
}
