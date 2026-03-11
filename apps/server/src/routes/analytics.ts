import { evaluations, generatedAds, tokenUsage } from "@nerdy/pipeline";
import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import type { AppDatabase } from "../db.js";

export function analyticsRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/analytics" })
		.get("/summary", async () => {
			const [totalResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(generatedAds);

			const [publishedResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(generatedAds)
				.where(sql`${generatedAds.status} = 'published'`);

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
				.where(sql`${generatedAds.status} = 'published'`);

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
		});
}
