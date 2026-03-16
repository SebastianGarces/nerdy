import { Annotation } from "@langchain/langgraph";
import type {
	AdBrief,
	Evaluation,
	EvaluationDimension,
	GeneratedAd,
	PipelineConfig,
	TokenUsageRecord,
} from "../types/index.js";

export const AdPipelineState = Annotation.Root({
	brief: Annotation<AdBrief>,
	briefId: Annotation<string>,
	currentAd: Annotation<GeneratedAd | null>({
		reducer: (_, n) => n,
		default: () => null,
	}),
	evaluations: Annotation<Evaluation[]>({
		reducer: (old, n) => [...old, ...n],
		default: () => [],
	}),
	iterationCount: Annotation<number>({
		reducer: (_, n) => n,
		default: () => 0,
	}),
	maxIterations: Annotation<number>({
		reducer: (_, n) => n,
		default: () => 3,
	}),
	weakestDimension: Annotation<EvaluationDimension | null>({
		reducer: (_, n) => n,
		default: () => null,
	}),
	tokenUsage: Annotation<TokenUsageRecord[]>({
		reducer: (old, n) => [...old, ...n],
		default: () => [],
	}),
	status: Annotation<"pending" | "iterating" | "approved" | "discarded">({
		reducer: (_, n) => n,
		default: () => "pending" as const,
	}),
	config: Annotation<PipelineConfig>,
	campaignPrompt: Annotation<string | null>({
		reducer: (_, n) => n,
		default: () => null,
	}),
});

export type AdPipelineStateType = typeof AdPipelineState.State;
