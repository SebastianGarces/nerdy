import type {
	AdBrief,
	CompetitorAd,
	GeneratedAd,
	PipelineConfig,
} from "../types/index.js";
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
		status: "published",
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
