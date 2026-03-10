import { Database } from "bun:sqlite";
import {
	adBriefs,
	campaigns,
	competitorAds,
	evaluations,
	generatedAds,
	iterationLogs,
	tokenUsage,
} from "@nerdy/pipeline";
import { drizzle } from "drizzle-orm/bun-sqlite";

const schema = {
	campaigns,
	competitorAds,
	adBriefs,
	generatedAds,
	evaluations,
	iterationLogs,
	tokenUsage,
};

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS campaigns (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	prompt TEXT NOT NULL,
	description TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'generating',
	ad_count INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS competitor_ads (
	id TEXT PRIMARY KEY,
	advertiser TEXT NOT NULL,
	primary_text TEXT NOT NULL,
	headline TEXT NOT NULL,
	description TEXT NOT NULL,
	start_date TEXT NOT NULL,
	end_date TEXT NOT NULL,
	duration_days INTEGER NOT NULL,
	platform TEXT NOT NULL,
	scraped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_briefs (
	id TEXT PRIMARY KEY,
	audience TEXT NOT NULL,
	product TEXT NOT NULL,
	campaign_goal TEXT NOT NULL,
	emotional_angle TEXT NOT NULL,
	hook_style TEXT NOT NULL,
	body_pattern TEXT NOT NULL,
	offer_type TEXT NOT NULL,
	brand_voice TEXT NOT NULL,
	campaign_id TEXT REFERENCES campaigns(id),
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_ads (
	id TEXT PRIMARY KEY,
	brief_id TEXT NOT NULL REFERENCES ad_briefs(id),
	primary_text TEXT NOT NULL,
	headline TEXT NOT NULL,
	description TEXT NOT NULL,
	call_to_action TEXT NOT NULL,
	model TEXT NOT NULL,
	prompt_tokens INTEGER NOT NULL,
	completion_tokens INTEGER NOT NULL,
	latency_ms INTEGER NOT NULL,
	iteration INTEGER NOT NULL,
	status TEXT NOT NULL DEFAULT 'draft',
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
	id TEXT PRIMARY KEY,
	ad_id TEXT NOT NULL REFERENCES generated_ads(id),
	dimensions TEXT NOT NULL,
	weighted_score REAL NOT NULL,
	confidence REAL NOT NULL,
	model TEXT NOT NULL,
	tokens_used INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS iteration_logs (
	id TEXT PRIMARY KEY,
	brief_id TEXT NOT NULL REFERENCES ad_briefs(id),
	iteration INTEGER NOT NULL,
	ad_id TEXT NOT NULL REFERENCES generated_ads(id),
	evaluation_id TEXT NOT NULL REFERENCES evaluations(id),
	weakest_dimension TEXT NOT NULL,
	action TEXT NOT NULL,
	score_before REAL NOT NULL,
	score_after REAL NOT NULL,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS token_usage (
	id TEXT PRIMARY KEY,
	operation TEXT NOT NULL,
	model TEXT NOT NULL,
	prompt_tokens INTEGER NOT NULL,
	completion_tokens INTEGER NOT NULL,
	total_tokens INTEGER NOT NULL,
	cost_usd REAL NOT NULL,
	created_at TEXT NOT NULL
);
`;

export function setupDatabase(url: string) {
	const sqlite = new Database(url);
	sqlite.exec(CREATE_TABLES_SQL);
	return drizzle(sqlite, { schema });
}

export function setupDatabaseFromSqlite(sqlite: Database) {
	sqlite.exec(CREATE_TABLES_SQL);
	return drizzle(sqlite, { schema });
}

export type AppDatabase = ReturnType<typeof setupDatabase>;
