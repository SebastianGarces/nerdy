import { ChatOpenAI } from "@langchain/openai";
import { nanoid } from "nanoid";
import type {
	AdBrief,
	Evaluation,
	EvaluationDimension,
	GeneratedAd,
	PipelineConfig,
} from "../types/index.js";
import { GeneratedAdOutputSchema } from "../types/index.js";
import {
	GENERATION_SYSTEM_PROMPT,
	buildGenerationPrompt,
	buildRegenerationPrompt,
} from "./prompts.js";

export { generateBriefs } from "./briefs.js";

export interface GenerationContext {
	previousAd: GeneratedAd;
	evaluation: Evaluation;
	targetDimension: EvaluationDimension;
	iteration: number;
}

export interface GenerateAdOptions {
	brief: AdBrief;
	config: PipelineConfig;
	context?: GenerationContext;
	briefId?: string;
	/** Optional LLM override for testing */
	llm?: ChatOpenAI;
	/** Optional campaign prompt for additional context */
	campaignPrompt?: string;
}

const MODEL = "google/gemini-2.0-flash-001";

export async function generateAd(
	options: GenerateAdOptions,
): Promise<GeneratedAd> {
	const { brief, config, context, llm: llmOverride } = options;
	const briefId = options.briefId ?? nanoid();
	const iteration = context?.iteration ?? 1;

	const llm =
		llmOverride ??
		new ChatOpenAI({
			modelName: MODEL,
			openAIApiKey: config.openRouterApiKey,
			configuration: {
				baseURL: config.openRouterBaseUrl,
			},
		});

	const structuredLlm = llm.withStructuredOutput(GeneratedAdOutputSchema);

	const userMessage = context
		? buildRegenerationPrompt(
				brief,
				context.previousAd,
				context.evaluation,
				context.targetDimension,
			)
		: buildGenerationPrompt(brief, options.campaignPrompt);

	const startTime = performance.now();

	const result = await structuredLlm.invoke([
		{ role: "system", content: GENERATION_SYSTEM_PROMPT },
		{ role: "user", content: userMessage },
	]);

	const latencyMs = Math.round(performance.now() - startTime);

	// Extract token usage from the response metadata if available
	// biome-ignore lint/suspicious/noExplicitAny: LangChain response metadata has dynamic shape
	const resultAny = result as any;
	const tokens: number =
		resultAny?.__run?.response_metadata?.tokenUsage?.totalTokens ??
		resultAny?.__run?.response_metadata?.usage?.total_tokens ??
		0;

	return {
		id: nanoid(),
		briefId,
		primaryText: result.primaryText,
		headline: result.headline,
		description: result.description,
		callToAction: result.callToAction,
		metadata: {
			model: MODEL,
			tokens: tokens as number,
			latencyMs,
		},
		iteration,
		status: "generating",
		createdAt: new Date().toISOString(),
	};
}
