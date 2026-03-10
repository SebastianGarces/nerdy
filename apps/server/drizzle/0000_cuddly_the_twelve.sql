CREATE TABLE `ad_briefs` (
	`id` text PRIMARY KEY NOT NULL,
	`audience` text NOT NULL,
	`product` text NOT NULL,
	`campaign_goal` text NOT NULL,
	`emotional_angle` text NOT NULL,
	`hook_style` text NOT NULL,
	`body_pattern` text NOT NULL,
	`offer_type` text NOT NULL,
	`brand_voice` text NOT NULL,
	`campaign_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`prompt` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'generating' NOT NULL,
	`ad_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `competitor_ads` (
	`id` text PRIMARY KEY NOT NULL,
	`advertiser` text NOT NULL,
	`primary_text` text NOT NULL,
	`headline` text NOT NULL,
	`description` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`duration_days` integer NOT NULL,
	`platform` text NOT NULL,
	`scraped_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`ad_id` text NOT NULL,
	`dimensions` text NOT NULL,
	`weighted_score` real NOT NULL,
	`confidence` real NOT NULL,
	`model` text NOT NULL,
	`tokens_used` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ad_id`) REFERENCES `generated_ads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generated_ads` (
	`id` text PRIMARY KEY NOT NULL,
	`brief_id` text NOT NULL,
	`primary_text` text NOT NULL,
	`headline` text NOT NULL,
	`description` text NOT NULL,
	`call_to_action` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`latency_ms` integer NOT NULL,
	`iteration` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `ad_briefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `iteration_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`brief_id` text NOT NULL,
	`iteration` integer NOT NULL,
	`ad_id` text NOT NULL,
	`evaluation_id` text NOT NULL,
	`weakest_dimension` text NOT NULL,
	`action` text NOT NULL,
	`score_before` real NOT NULL,
	`score_after` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `ad_briefs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ad_id`) REFERENCES `generated_ads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `token_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`operation` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`cost_usd` real NOT NULL,
	`created_at` text NOT NULL
);
