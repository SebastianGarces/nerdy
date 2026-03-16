import { evaluations, generatedAds, tokenUsage } from "@nerdy/pipeline";
import { eq, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import type { AppDatabase } from "../db.js";

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const index = (p / 100) * (sorted.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const lowerVal = sorted[lower] ?? 0;
	const upperVal = sorted[upper] ?? 0;
	if (lower === upper) return lowerVal;
	const weight = index - lower;
	return Math.round(lowerVal * (1 - weight) + upperVal * weight);
}

function computeStats(values: number[]) {
	if (values.length === 0) {
		return { avg: 0, p50: 0, p95: 0, count: 0 };
	}
	const sorted = [...values].sort((a, b) => a - b);
	const sum = sorted.reduce((a, b) => a + b, 0);
	return {
		avg: Math.round(sum / sorted.length),
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		count: sorted.length,
	};
}

export function analyticsRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/analytics" })
		.get("/summary", async () => {
			const [totalResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(generatedAds);

			const [publishedResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(generatedAds)
				.where(sql`${generatedAds.status} = 'approved'`);

			const [tokenResult] = await db
				.select({
					totalTokens: sql<number>`coalesce(sum(${tokenUsage.totalTokens}), 0)`,
					totalCost: sql<number>`coalesce(sum(${tokenUsage.costUsd}), 0)`,
				})
				.from(tokenUsage);

			const [scoreResult] = await db
				.select({
					avgScore: sql<number>`avg(${evaluations.weightedScore})`,
				})
				.from(evaluations)
				.innerJoin(generatedAds, sql`${evaluations.adId} = ${generatedAds.id}`)
				.where(sql`${generatedAds.status} = 'approved'`);

			const [latencyResult] = await db
				.select({ avg: sql<number>`avg(latency_ms)` })
				.from(generatedAds);

			const totalAds = totalResult?.count ?? 0;
			const publishedAds = publishedResult?.count ?? 0;
			const totalTokens = tokenResult?.totalTokens ?? 0;
			const totalCost = tokenResult?.totalCost ?? 0;
			const avgPublishedScore = scoreResult?.avgScore ?? 0;

			return {
				totalAds,
				publishedAds,
				totalTokens,
				totalCost,
				avgPublishedScore,
				costPerAd: totalAds > 0 ? totalCost / totalAds : 0,
				costPerPassingAd: publishedAds > 0 ? totalCost / publishedAds : 0,
				qualityPerDollar: totalCost > 0 ? avgPublishedScore / totalCost : 0,
				avgLatencyMs: Math.round(latencyResult?.avg ?? 0),
			};
		})
		.get("/cost-over-time", async () => {
			const rows = await db
				.select({
					date: sql<string>`date(${tokenUsage.createdAt})`.as("date"),
					dailyCost: sql<number>`sum(${tokenUsage.costUsd})`.as("daily_cost"),
					dailyTokens: sql<number>`sum(${tokenUsage.totalTokens})`.as(
						"daily_tokens",
					),
					operationCount: sql<number>`count(*)`.as("operation_count"),
				})
				.from(tokenUsage)
				.groupBy(sql`date(${tokenUsage.createdAt})`)
				.orderBy(sql`date(${tokenUsage.createdAt})`);

			return rows;
		})
		.get("/cost-by-operation", async () => {
			const rows = await db
				.select({
					operation: tokenUsage.operation,
					totalCost: sql<number>`sum(${tokenUsage.costUsd})`.as("total_cost"),
					totalTokens: sql<number>`sum(${tokenUsage.totalTokens})`.as(
						"total_tokens",
					),
					count: sql<number>`count(*)`.as("count"),
				})
				.from(tokenUsage)
				.groupBy(tokenUsage.operation)
				.orderBy(sql`sum(${tokenUsage.costUsd}) desc`);

			return rows;
		})
		.get("/efficiency-over-time", async () => {
			const rows = await db.all<{
				date: string;
				dailyCost: number;
				avgScore: number;
				costPerQualityPoint: number;
			}>(sql`
				SELECT
					c.date,
					c.daily_cost AS "dailyCost",
					e.avg_score AS "avgScore",
					CASE WHEN e.avg_score > 0 THEN c.daily_cost / e.avg_score ELSE 0 END AS "costPerQualityPoint"
				FROM (
					SELECT date(created_at) AS date, sum(cost_usd) AS daily_cost
					FROM token_usage
					GROUP BY date(created_at)
				) c
				INNER JOIN (
					SELECT date(created_at) AS date, avg(weighted_score) AS avg_score
					FROM evaluations
					GROUP BY date(created_at)
				) e ON c.date = e.date
				ORDER BY c.date ASC
			`);

			return rows;
		})
		.get("/iteration-cost", async () => {
			const iterations = await db
				.select({
					iteration: generatedAds.iteration,
					adCount: sql<number>`count(*)`.as("ad_count"),
				})
				.from(generatedAds)
				.groupBy(generatedAds.iteration)
				.orderBy(generatedAds.iteration);

			const costByOperation = await db
				.select({
					operation: tokenUsage.operation,
					avgCost: sql<number>`avg(${tokenUsage.costUsd})`.as("avg_cost"),
				})
				.from(tokenUsage)
				.groupBy(tokenUsage.operation)
				.orderBy(tokenUsage.operation);

			return { iterations, costByOperation };
		})
		.get("/latency-summary", async () => {
			const genRows = await db
				.select({ latencyMs: generatedAds.latencyMs })
				.from(generatedAds);
			const genValues = genRows.map((r) => r.latencyMs);

			const evalRows = await db
				.select({ latencyMs: evaluations.latencyMs })
				.from(evaluations);
			const evalValues = evalRows
				.map((r) => r.latencyMs)
				.filter((v): v is number => v != null && v > 0);

			const e2eRows = await db
				.select({
					briefId: generatedAds.briefId,
					genLatency: sql<number>`sum(${generatedAds.latencyMs})`,
					evalLatency: sql<number>`sum(${evaluations.latencyMs})`,
				})
				.from(generatedAds)
				.leftJoin(evaluations, eq(evaluations.adId, generatedAds.id))
				.groupBy(generatedAds.briefId);

			const e2eValues = e2eRows.map(
				(r) => (r.genLatency ?? 0) + (r.evalLatency ?? 0),
			);

			return {
				generation: computeStats(genValues),
				evaluation: computeStats(evalValues),
				endToEnd: computeStats(e2eValues),
			};
		})
		.get("/latency-over-time", async () => {
			const rows = await db
				.select({
					date: sql<string>`date(${generatedAds.createdAt})`,
					avgGenerationMs: sql<number>`avg(${generatedAds.latencyMs})`,
					avgEvaluationMs: sql<number>`coalesce(avg(${evaluations.latencyMs}), 0)`,
					adCount: sql<number>`count(distinct ${generatedAds.id})`,
				})
				.from(generatedAds)
				.leftJoin(evaluations, eq(evaluations.adId, generatedAds.id))
				.groupBy(sql`date(${generatedAds.createdAt})`)
				.orderBy(sql`date(${generatedAds.createdAt})`);

			return rows.map((r) => ({
				date: r.date,
				avgGenerationMs: Math.round(r.avgGenerationMs),
				avgEvaluationMs: Math.round(r.avgEvaluationMs),
				adCount: r.adCount,
			}));
		});
}
