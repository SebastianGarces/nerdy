import type { AdBrief, GeneratedAd, PipelineConfig } from "../types/index.js";
import { evaluateAd } from "./index.js";

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
