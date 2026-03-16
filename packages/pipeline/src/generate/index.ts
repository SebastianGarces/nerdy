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
	/** Optional persona context for targeted ad generation */
	personaContext?: string;
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
			temperature: 0.7,
			openAIApiKey: config.openRouterApiKey,
			configuration: {
				baseURL: config.openRouterBaseUrl,
			},
		});

	const structuredLlm = llm.withStructuredOutput(GeneratedAdOutputSchema, {
		includeRaw: true,
	});

	const userMessage = context
		? buildRegenerationPrompt(brief, context.previousAd, context.evaluation)
		: buildGenerationPrompt(
				brief,
				options.campaignPrompt,
				options.personaContext,
			);

	const startTime = performance.now();

	const rawResult = await structuredLlm.invoke([
		{ role: "system", content: GENERATION_SYSTEM_PROMPT },
		{ role: "user", content: userMessage },
	]);

	const latencyMs = Math.round(performance.now() - startTime);

	// Extract token usage from the raw AIMessage response_metadata
	// biome-ignore lint/suspicious/noExplicitAny: LangChain response metadata has dynamic shape
	const rawMsg = rawResult.raw as any;
	const tokenUsage = rawMsg?.response_metadata?.tokenUsage;
	const usage = rawMsg?.response_metadata?.usage;
	const totalTokens: number =
		tokenUsage?.totalTokens ?? usage?.total_tokens ?? 0;
	const promptTokens: number =
		tokenUsage?.promptTokens ??
		usage?.prompt_tokens ??
		(totalTokens > 0 ? Math.round(totalTokens * 0.6) : 0);
	const completionTokens: number =
		tokenUsage?.completionTokens ??
		usage?.completion_tokens ??
		(totalTokens > 0 ? totalTokens - promptTokens : 0);

	const parsed = rawResult.parsed;

	return {
		id: nanoid(),
		briefId,
		primaryText: parsed.primaryText,
		headline: parsed.headline,
		description: parsed.description,
		callToAction: parsed.callToAction,
		metadata: {
			model: MODEL,
			tokens: totalTokens,
			promptTokens,
			completionTokens,
			latencyMs,
		},
		iteration,
		status: "generating",
		createdAt: new Date().toISOString(),
	};
}
