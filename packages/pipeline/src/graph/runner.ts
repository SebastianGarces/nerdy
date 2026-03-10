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
}

export async function runPipeline(
	briefs: AdBrief[],
	config: PipelineConfig,
	db: ReturnType<typeof createDb>,
	options?: RunPipelineOptions,
): Promise<AdPipelineStateType[]> {
	const concurrency = options?.concurrency ?? 3;
	const maxIterations = options?.maxIterations ?? 3;

	const app = createAdPipelineGraph(db, options?.nodeOptions);

	// Insert briefs into the database and prepare inputs
	const inputs: Array<{
		brief: AdBrief;
		briefId: string;
		config: PipelineConfig;
		maxIterations: number;
		campaignPrompt: string | null;
	}> = [];

	for (const brief of briefs) {
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
	const results: AdPipelineStateType[] = [];

	for (let i = 0; i < inputs.length; i += concurrency) {
		const batch = inputs.slice(i, i + concurrency);
		const batchResults = await Promise.all(
			batch.map((input) => app.invoke(input)),
		);
		results.push(...batchResults);
	}

	return results;
}
