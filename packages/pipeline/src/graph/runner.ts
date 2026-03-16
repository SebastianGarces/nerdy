import { nanoid } from "nanoid";
import type { createDb } from "../db/index.js";
import { adBriefs } from "../db/schema.js";
import type { AdBrief, PipelineConfig } from "../types/index.js";
import { createAdPipelineGraph } from "./index.js";
import type { NodeOptions } from "./nodes.js";
import type { AdPipelineStateType } from "./state.js";

export interface RunPipelineOptions {
	concurrency?: number;
	maxIterations?: number;
	nodeOptions?: NodeOptions;
	campaignPrompt?: string;
	campaignId?: string;
	targetCount?: number;
	maxRetryRounds?: number;
	generateMoreBriefs?: (count: number) => Promise<AdBrief[]>;
}

export async function runPipeline(
	briefs: AdBrief[],
	config: PipelineConfig,
	db: ReturnType<typeof createDb>,
	options?: RunPipelineOptions,
): Promise<AdPipelineStateType[]> {
	const concurrency = options?.concurrency ?? 3;
	const maxIterations = options?.maxIterations ?? 3;
	const targetCount = options?.targetCount;
	const maxRetryRounds = options?.maxRetryRounds ?? 5;

	const app = createAdPipelineGraph(db, options?.nodeOptions);
	const allResults: AdPipelineStateType[] = [];
	let currentBriefs = briefs;
	let retryRound = 0;

	while (true) {
		// Insert briefs into the database and prepare inputs
		const inputs: Array<{
			brief: AdBrief;
			briefId: string;
			config: PipelineConfig;
			maxIterations: number;
			campaignPrompt: string | null;
		}> = [];

		for (const brief of currentBriefs) {
			const briefId = nanoid();
			await db.insert(adBriefs).values({
				id: briefId,
				audience: brief.audience,
				product: brief.product,
				campaignGoal: brief.campaignGoal,
				emotionalAngle: brief.emotionalAngle,
				hookStyle: brief.hookStyle,
				bodyPattern: brief.bodyPattern,
				offerType: brief.offerType,
				brandVoice: JSON.stringify(brief.brandVoice),
				proofPoints: brief.proofPoints
					? JSON.stringify(brief.proofPoints)
					: null,
				persona: brief.persona ?? null,
				campaignId: options?.campaignId ?? null,
				createdAt: new Date().toISOString(),
			});

			inputs.push({
				brief,
				briefId,
				config,
				maxIterations,
				campaignPrompt: options?.campaignPrompt ?? null,
			});
		}

		// Process in batches with concurrency limit
		for (let i = 0; i < inputs.length; i += concurrency) {
			const batch = inputs.slice(i, i + concurrency);
			const batchResults = await Promise.all(
				batch.map((input) => app.invoke(input)),
			);
			allResults.push(...batchResults);

			// Stop mid-batch if we've hit the target
			if (targetCount) {
				const approvedSoFar = allResults.filter(
					(r) => r.status === "approved",
				).length;
				if (approvedSoFar >= targetCount) break;
			}
		}

		// If no target count set, single-pass (backwards compatible)
		if (!targetCount) break;

		const publishedCount = allResults.filter(
			(r) => r.status === "approved",
		).length;
		if (publishedCount >= targetCount) break;

		if (retryRound >= maxRetryRounds || !options?.generateMoreBriefs) break;
		retryRound++;

		const deficit = targetCount - publishedCount;
		const overGenCount = Math.ceil(deficit * 1.5);
		currentBriefs = await options.generateMoreBriefs(overGenCount);
		if (currentBriefs.length === 0) break;
	}

	return allResults;
}
