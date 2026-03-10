import { ChatOpenAI } from "@langchain/openai";
import { nanoid } from "nanoid";
import type {
	AdBrief,
	DimensionScore,
	Evaluation,
	EvaluationDimension,
	GeneratedAd,
	PipelineConfig,
} from "../types/index.js";
import { EvaluationOutputSchema } from "../types/index.js";
import { EVALUATION_SYSTEM_PROMPT, buildEvaluationPrompt } from "./prompts.js";

export { EVALUATION_SYSTEM_PROMPT, buildEvaluationPrompt } from "./prompts.js";

const EVALUATOR_MODEL = "google/gemini-2.0-flash-001";

export const DIMENSION_WEIGHTS: Record<EvaluationDimension, number> = {
	clarity: 0.2,
	valueProposition: 0.25,
	callToAction: 0.2,
	brandVoice: 0.15,
	emotionalResonance: 0.2,
};

export function calculateWeightedScore(dimensions: DimensionScore[]): number {
	let total = 0;
	for (const dim of dimensions) {
		const weight = DIMENSION_WEIGHTS[dim.dimension];
		total += dim.score * weight;
	}
	return Math.round(total * 100) / 100;
}

export interface LLMInterface {
	invoke(messages: Array<{ role: string; content: string }>): Promise<{
		dimensions: Array<{
			dimension: string;
			score: number;
			rationale: string;
		}>;
		confidence: number;
	}>;
}

function createLLM(config: PipelineConfig): LLMInterface {
	const model = new ChatOpenAI({
		modelName: EVALUATOR_MODEL,
		temperature: 0,
		configuration: {
			baseURL: config.openRouterBaseUrl,
			apiKey: config.openRouterApiKey,
		},
	});

	return model.withStructuredOutput(
		EvaluationOutputSchema,
	) as unknown as LLMInterface;
}

export async function evaluateAd(
	ad: GeneratedAd,
	brief: AdBrief,
	config: PipelineConfig,
	llm?: LLMInterface,
): Promise<Evaluation> {
	const model = llm ?? createLLM(config);

	const messages = [
		{ role: "system" as const, content: EVALUATION_SYSTEM_PROMPT },
		{ role: "user" as const, content: buildEvaluationPrompt(ad, brief) },
	];

	let result: {
		dimensions: Array<{ dimension: string; score: number; rationale: string }>;
		confidence: number;
	};

	try {
		result = await model.invoke(messages);
	} catch (_error) {
		// Retry once on failure
		try {
			result = await model.invoke(messages);
		} catch (_retryError) {
			// Return a low-score evaluation on double failure
			return createFallbackEvaluation(ad.id);
		}
	}

	// Validate the result has all 5 dimensions
	const dimensionNames = new Set(result.dimensions.map((d) => d.dimension));
	const requiredDimensions: EvaluationDimension[] = [
		"clarity",
		"valueProposition",
		"callToAction",
		"brandVoice",
		"emotionalResonance",
	];

	for (const dim of requiredDimensions) {
		if (!dimensionNames.has(dim)) {
			return createFallbackEvaluation(ad.id);
		}
	}

	const dimensions: DimensionScore[] = result.dimensions.map((d) => ({
		dimension: d.dimension as EvaluationDimension,
		score: d.score,
		rationale: d.rationale,
	}));

	const weightedScore = calculateWeightedScore(dimensions);

	// Extract token usage if available
	let tokensUsed = 0;
	const resultWithMeta = result as Record<string, unknown>;
	if (
		resultWithMeta?.response_metadata &&
		typeof resultWithMeta.response_metadata === "object"
	) {
		const meta = resultWithMeta.response_metadata as Record<string, unknown>;
		if (meta.tokenUsage && typeof meta.tokenUsage === "object") {
			const usage = meta.tokenUsage as Record<string, number>;
			tokensUsed = usage.totalTokens ?? 0;
		}
	}

	return {
		id: nanoid(),
		adId: ad.id,
		dimensions,
		weightedScore,
		confidence: result.confidence,
		model: EVALUATOR_MODEL,
		tokensUsed,
		createdAt: new Date().toISOString(),
	};
}

function createFallbackEvaluation(adId: string): Evaluation {
	const dimensions: DimensionScore[] = [
		{ dimension: "clarity", score: 1, rationale: "Evaluation failed" },
		{
			dimension: "valueProposition",
			score: 1,
			rationale: "Evaluation failed",
		},
		{ dimension: "callToAction", score: 1, rationale: "Evaluation failed" },
		{ dimension: "brandVoice", score: 1, rationale: "Evaluation failed" },
		{
			dimension: "emotionalResonance",
			score: 1,
			rationale: "Evaluation failed",
		},
	];

	return {
		id: nanoid(),
		adId,
		dimensions,
		weightedScore: 1.0,
		confidence: 0,
		model: EVALUATOR_MODEL,
		tokensUsed: 0,
		createdAt: new Date().toISOString(),
	};
}
