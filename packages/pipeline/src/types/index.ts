import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────────────

export const Audience = z.enum(["parent", "student", "family"]);
export type Audience = z.infer<typeof Audience>;

export const CampaignGoal = z.enum(["awareness", "conversion"]);
export type CampaignGoal = z.infer<typeof CampaignGoal>;

export const EmotionalAngle = z.enum([
	"aspiration",
	"anxiety-relief",
	"social-proof",
	"urgency",
]);
export type EmotionalAngle = z.infer<typeof EmotionalAngle>;

export const HookStyle = z.enum(["question", "stat", "story", "fear"]);
export type HookStyle = z.infer<typeof HookStyle>;

export const BodyPattern = z.enum([
	"problem-agitate-solution",
	"testimonial-benefit",
	"stat-context-offer",
]);
export type BodyPattern = z.infer<typeof BodyPattern>;

export const AdStatus = z.enum(["draft", "published", "discarded"]);
export type AdStatus = z.infer<typeof AdStatus>;

export const EvaluationDimension = z.enum([
	"clarity",
	"valueProposition",
	"callToAction",
	"brandVoice",
	"emotionalResonance",
]);
export type EvaluationDimension = z.infer<typeof EvaluationDimension>;

export const IterationAction = z.enum(["regenerate", "publish", "discard"]);
export type IterationAction = z.infer<typeof IterationAction>;

export const TokenOperation = z.enum(["generate", "evaluate", "diagnose"]);
export type TokenOperation = z.infer<typeof TokenOperation>;

export const CampaignStatus = z.enum(["generating", "completed", "failed"]);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

export const CampaignSchema = z.object({
	name: z.string().min(1),
	prompt: z.string().min(1),
	description: z.string().min(1),
	status: CampaignStatus,
	adCount: z.number().int().min(0),
});

// ── Zod Schemas ────────────────────────────────────────────────────────────

export const AdBriefSchema = z.object({
	audience: Audience,
	product: z.string().min(1),
	campaignGoal: CampaignGoal,
	emotionalAngle: EmotionalAngle,
	hookStyle: HookStyle,
	bodyPattern: BodyPattern,
	offerType: z.string().min(1),
	brandVoice: z.array(z.string().min(1)).min(1),
});

export const DimensionScoreSchema = z.object({
	dimension: EvaluationDimension,
	score: z.number().int().min(1).max(10),
	rationale: z.string().min(1),
});

export const EvaluationOutputSchema = z.object({
	dimensions: z.array(DimensionScoreSchema).length(5),
	confidence: z.number().min(0).max(1),
});

export const GeneratedAdOutputSchema = z.object({
	primaryText: z.string().min(1),
	headline: z.string().min(1),
	description: z.string().min(1),
	callToAction: z.string().min(1),
});

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface Campaign {
	id: string;
	name: string;
	prompt: string;
	description: string;
	status: CampaignStatus;
	adCount: number;
	createdAt: string;
}

export interface PipelineConfig {
	openRouterApiKey: string;
	openRouterBaseUrl: string;
	databaseUrl: string;
}

export interface AdBrief extends z.infer<typeof AdBriefSchema> {}

export interface GeneratedAd {
	id: string;
	briefId: string;
	primaryText: string;
	headline: string;
	description: string;
	callToAction: string;
	metadata: {
		model: string;
		tokens: number;
		latencyMs: number;
	};
	iteration: number;
	status: AdStatus;
	createdAt: string;
}

export interface DimensionScore extends z.infer<typeof DimensionScoreSchema> {}

export interface Evaluation {
	id: string;
	adId: string;
	dimensions: DimensionScore[];
	weightedScore: number;
	confidence: number;
	model: string;
	tokensUsed: number;
	createdAt: string;
}

export interface IterationLog {
	id: string;
	briefId: string;
	iteration: number;
	adId: string;
	evaluationId: string;
	weakestDimension: EvaluationDimension;
	action: IterationAction;
	scoreBefore: number;
	scoreAfter: number;
}

export interface TokenUsageRecord {
	id: string;
	operation: TokenOperation;
	model: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	costUsd: number;
	createdAt: string;
}

export interface CompetitorAd {
	id: string;
	advertiser: string;
	primaryText: string;
	headline: string;
	description: string;
	startDate: string;
	endDate: string;
	durationDays: number;
	platform: string;
	scrapedAt: string;
}

export interface AdGraphState {
	brief: AdBrief;
	currentAd: GeneratedAd | null;
	evaluations: Evaluation[];
	iterationCount: number;
	maxIterations: number;
	weakestDimension: EvaluationDimension | null;
	tokenUsage: TokenUsageRecord[];
	status: "pending" | "iterating" | "published" | "discarded";
}
