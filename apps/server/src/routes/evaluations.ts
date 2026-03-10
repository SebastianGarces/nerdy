import {
	evaluations,
	generatedAds,
	iterationLogs,
	tokenUsage,
} from "@nerdy/pipeline";
import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import type { AppDatabase } from "../db.js";

export function evaluationRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/evaluations" })
		.get("/trends", async () => {
			const trends = await db
				.select({
					date: sql<string>`date(${evaluations.createdAt})`.as("date"),
					avgScore: sql<number>`avg(${evaluations.weightedScore})`.as(
						"avg_score",
					),
					count: sql<number>`count(*)`.as("count"),
				})
				.from(evaluations)
				.groupBy(sql`date(${evaluations.createdAt})`)
				.orderBy(sql`date(${evaluations.createdAt})`);

			return { trends };
		})
		.get("/stats", async () => {
			const [totalResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(generatedAds);

			const [publishedResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(generatedAds)
				.where(sql`${generatedAds.status} = 'published'`);

			const [avgScoreResult] = await db
				.select({
					avgScore: sql<number>`avg(${evaluations.weightedScore})`,
				})
				.from(evaluations);

			const [avgIterResult] = await db
				.select({
					avgIterations: sql<number>`avg(${iterationLogs.iteration})`,
				})
				.from(iterationLogs);

			const [costResult] = await db
				.select({
					totalCost: sql<number>`coalesce(sum(${tokenUsage.costUsd}), 0)`,
				})
				.from(tokenUsage);

			const totalAds = totalResult?.count ?? 0;
			const publishedAds = publishedResult?.count ?? 0;
			const passRate = totalAds > 0 ? publishedAds / totalAds : 0;

			return {
				passRate,
				avgIterations: avgIterResult?.avgIterations ?? 0,
				avgScore: avgScoreResult?.avgScore ?? 0,
				totalAds,
				totalCost: costResult?.totalCost ?? 0,
			};
		});
}
