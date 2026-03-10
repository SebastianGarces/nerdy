import type { ChatOpenAI } from "@langchain/openai";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { createDb } from "../db/index.js";
import {
	evaluations as evaluationsTable,
	generatedAds,
	iterationLogs,
} from "../db/schema.js";
import { evaluateAd } from "../evaluate/index.js";
import type { LLMInterface } from "../evaluate/index.js";
import { generateAd } from "../generate/index.js";
import { diagnoseWeakness, shouldRetry } from "../iterate/index.js";
import type { AdPipelineStateType } from "./state.js";

export const QUALITY_THRESHOLD = 7.5;

export interface NodeOptions {
	generateLlm?: ChatOpenAI;
	evaluateLlm?: LLMInterface;
}

export function createNodes(
	db: ReturnType<typeof createDb>,
	options?: NodeOptions,
) {
	async function generate(
		state: AdPipelineStateType,
	): Promise<Partial<AdPipelineStateType>> {
		const ad = await generateAd({
			brief: state.brief,
			config: state.config,
			briefId: state.briefId,
			llm: options?.generateLlm,
			campaignPrompt: state.campaignPrompt ?? undefined,
		});

		await db.insert(generatedAds).values({
			id: ad.id,
			briefId: ad.briefId,
			primaryText: ad.primaryText,
			headline: ad.headline,
			description: ad.description,
			callToAction: ad.callToAction,
			model: ad.metadata.model,
			promptTokens: 0,
			completionTokens: 0,
			latencyMs: ad.metadata.latencyMs,
			iteration: ad.iteration,
			status: ad.status,
			createdAt: ad.createdAt,
		});

		return {
			currentAd: ad,
			iterationCount: 1,
			status: "iterating",
		};
	}

	async function evaluate(
		state: AdPipelineStateType,
	): Promise<Partial<AdPipelineStateType>> {
		const ad = state.currentAd;
		if (!ad) {
			throw new Error("No current ad to evaluate");
		}

		const evaluation = await evaluateAd(
			ad,
			state.brief,
			state.config,
			options?.evaluateLlm,
		);

		await db.insert(evaluationsTable).values({
			id: evaluation.id,
			adId: evaluation.adId,
			dimensions: JSON.stringify(evaluation.dimensions),
			weightedScore: evaluation.weightedScore,
			confidence: evaluation.confidence,
			model: evaluation.model,
			tokensUsed: evaluation.tokensUsed,
			createdAt: evaluation.createdAt,
		});

		return {
			evaluations: [evaluation],
		};
	}

	async function decide(
		state: AdPipelineStateType,
	): Promise<Partial<AdPipelineStateType>> {
		const latestEvaluation = state.evaluations[state.evaluations.length - 1];
		if (!latestEvaluation) {
			throw new Error("No evaluation to decide on");
		}

		if (latestEvaluation.weightedScore >= QUALITY_THRESHOLD) {
			return { status: "published" };
		}

		const canRetry = shouldRetry({
			brief: state.brief,
			currentAd: state.currentAd,
			evaluations: state.evaluations,
			iterationCount: state.iterationCount,
			maxIterations: state.maxIterations,
			weakestDimension: state.weakestDimension,
			tokenUsage: state.tokenUsage,
			status: state.status,
		});

		if (canRetry) {
			const weakest = diagnoseWeakness(latestEvaluation);
			return {
				weakestDimension: weakest,
				status: "iterating",
			};
		}

		return { status: "discarded" };
	}

	async function publish(
		state: AdPipelineStateType,
	): Promise<Partial<AdPipelineStateType>> {
		const ad = state.currentAd;
		if (!ad) {
			throw new Error("No ad to publish");
		}

		await db
			.update(generatedAds)
			.set({ status: "published" })
			.where(eq(generatedAds.id, ad.id));

		const latestEvaluation = state.evaluations[state.evaluations.length - 1];

		await db.insert(iterationLogs).values({
			id: nanoid(),
			briefId: state.briefId,
			iteration: state.iterationCount,
			adId: ad.id,
			evaluationId: latestEvaluation?.id ?? "",
			weakestDimension: state.weakestDimension ?? "clarity",
			action: "publish",
			scoreBefore:
				state.evaluations.length > 1
					? (state.evaluations[state.evaluations.length - 2]?.weightedScore ??
						0)
					: 0,
			scoreAfter: latestEvaluation?.weightedScore ?? 0,
			createdAt: new Date().toISOString(),
		});

		return {};
	}

	async function discard(
		state: AdPipelineStateType,
	): Promise<Partial<AdPipelineStateType>> {
		const ad = state.currentAd;
		if (!ad) {
			throw new Error("No ad to discard");
		}

		await db
			.update(generatedAds)
			.set({ status: "discarded" })
			.where(eq(generatedAds.id, ad.id));

		const latestEvaluation = state.evaluations[state.evaluations.length - 1];

		await db.insert(iterationLogs).values({
			id: nanoid(),
			briefId: state.briefId,
			iteration: state.iterationCount,
			adId: ad.id,
			evaluationId: latestEvaluation?.id ?? "",
			weakestDimension: state.weakestDimension ?? "clarity",
			action: "discard",
			scoreBefore:
				state.evaluations.length > 1
					? (state.evaluations[state.evaluations.length - 2]?.weightedScore ??
						0)
					: 0,
			scoreAfter: latestEvaluation?.weightedScore ?? 0,
			createdAt: new Date().toISOString(),
		});

		return {};
	}

	async function regenerate(
		state: AdPipelineStateType,
	): Promise<Partial<AdPipelineStateType>> {
		const previousAd = state.currentAd;
		if (!previousAd) {
			throw new Error("No previous ad for regeneration");
		}

		const latestEvaluation = state.evaluations[state.evaluations.length - 1];
		if (!latestEvaluation) {
			throw new Error("No evaluation for regeneration context");
		}

		const targetDimension = state.weakestDimension ?? "clarity";
		const newIteration = state.iterationCount + 1;

		const ad = await generateAd({
			brief: state.brief,
			config: state.config,
			briefId: state.briefId,
			llm: options?.generateLlm,
			campaignPrompt: state.campaignPrompt ?? undefined,
			context: {
				previousAd,
				evaluation: latestEvaluation,
				targetDimension,
				iteration: newIteration,
			},
		});

		// Mark the superseded ad as discarded
		await db
			.update(generatedAds)
			.set({ status: "discarded" })
			.where(eq(generatedAds.id, previousAd.id));

		await db.insert(generatedAds).values({
			id: ad.id,
			briefId: ad.briefId,
			primaryText: ad.primaryText,
			headline: ad.headline,
			description: ad.description,
			callToAction: ad.callToAction,
			model: ad.metadata.model,
			promptTokens: 0,
			completionTokens: 0,
			latencyMs: ad.metadata.latencyMs,
			iteration: ad.iteration,
			status: ad.status,
			createdAt: ad.createdAt,
		});

		return {
			currentAd: ad,
			iterationCount: newIteration,
		};
	}

	return { generate, evaluate, decide, regenerate, publish, discard };
}
