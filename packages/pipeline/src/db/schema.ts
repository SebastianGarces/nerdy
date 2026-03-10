import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// ── competitor_ads ─────────────────────────────────────────────────────────

export const competitorAds = sqliteTable("competitor_ads", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	advertiser: text("advertiser").notNull(),
	primaryText: text("primary_text").notNull(),
	headline: text("headline").notNull(),
	description: text("description").notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date").notNull(),
	durationDays: integer("duration_days").notNull(),
	platform: text("platform").notNull(),
	scrapedAt: text("scraped_at").notNull(),
});

// ── ad_briefs ──────────────────────────────────────────────────────────────

export const adBriefs = sqliteTable("ad_briefs", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	audience: text("audience").notNull(),
	product: text("product").notNull(),
	campaignGoal: text("campaign_goal").notNull(),
	emotionalAngle: text("emotional_angle").notNull(),
	hookStyle: text("hook_style").notNull(),
	bodyPattern: text("body_pattern").notNull(),
	offerType: text("offer_type").notNull(),
	brandVoice: text("brand_voice").notNull(), // JSON stringified string[]
	createdAt: text("created_at").notNull(),
});

// ── generated_ads ──────────────────────────────────────────────────────────

export const generatedAds = sqliteTable("generated_ads", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	briefId: text("brief_id")
		.notNull()
		.references(() => adBriefs.id),
	primaryText: text("primary_text").notNull(),
	headline: text("headline").notNull(),
	description: text("description").notNull(),
	callToAction: text("call_to_action").notNull(),
	model: text("model").notNull(),
	promptTokens: integer("prompt_tokens").notNull(),
	completionTokens: integer("completion_tokens").notNull(),
	latencyMs: integer("latency_ms").notNull(),
	iteration: integer("iteration").notNull(),
	status: text("status").notNull().default("draft"),
	createdAt: text("created_at").notNull(),
});

// ── evaluations ────────────────────────────────────────────────────────────

export const evaluations = sqliteTable("evaluations", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	adId: text("ad_id")
		.notNull()
		.references(() => generatedAds.id),
	dimensions: text("dimensions").notNull(), // JSON stringified DimensionScore[]
	weightedScore: real("weighted_score").notNull(),
	confidence: real("confidence").notNull(),
	model: text("model").notNull(),
	tokensUsed: integer("tokens_used").notNull(),
	createdAt: text("created_at").notNull(),
});

// ── iteration_logs ─────────────────────────────────────────────────────────

export const iterationLogs = sqliteTable("iteration_logs", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	briefId: text("brief_id")
		.notNull()
		.references(() => adBriefs.id),
	iteration: integer("iteration").notNull(),
	adId: text("ad_id")
		.notNull()
		.references(() => generatedAds.id),
	evaluationId: text("evaluation_id")
		.notNull()
		.references(() => evaluations.id),
	weakestDimension: text("weakest_dimension").notNull(),
	action: text("action").notNull(),
	scoreBefore: real("score_before").notNull(),
	scoreAfter: real("score_after").notNull(),
	createdAt: text("created_at").notNull(),
});

// ── token_usage ────────────────────────────────────────────────────────────

export const tokenUsage = sqliteTable("token_usage", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => nanoid()),
	operation: text("operation").notNull(),
	model: text("model").notNull(),
	promptTokens: integer("prompt_tokens").notNull(),
	completionTokens: integer("completion_tokens").notNull(),
	totalTokens: integer("total_tokens").notNull(),
	costUsd: real("cost_usd").notNull(),
	createdAt: text("created_at").notNull(),
});
