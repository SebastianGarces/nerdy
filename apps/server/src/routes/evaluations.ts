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
		.get("/export", async ({ query }) => {
			const format = query.format ?? "json";

			// Join evaluations with generated_ads to get full data
			const rows = await db
				.select({
					evalId: evaluations.id,
					adId: evaluations.adId,
					primaryText: generatedAds.primaryText,
					headline: generatedAds.headline,
					description: generatedAds.description,
					callToAction: generatedAds.callToAction,
					dimensions: evaluations.dimensions,
					weightedScore: evaluations.weightedScore,
					confidence: evaluations.confidence,
					model: evaluations.model,
					iteration: generatedAds.iteration,
					createdAt: evaluations.createdAt,
				})
				.from(evaluations)
				.innerJoin(generatedAds, sql`${evaluations.adId} = ${generatedAds.id}`);

			if (format === "csv") {
				const header =
					"id,primaryText,headline,description,callToAction,clarity,valueProposition,callToActionScore,brandVoice,emotionalResonance,weightedScore,iteration";
				const csvRows = rows.map((row) => {
					const dims = JSON.parse(row.dimensions as string) as Array<{
						dimension: string;
						score: number;
					}>;
					const dimMap: Record<string, number> = {};
					for (const d of dims) dimMap[d.dimension] = d.score;
					return [
						row.evalId,
						`"${(row.primaryText ?? "").replace(/"/g, '""')}"`,
						`"${(row.headline ?? "").replace(/"/g, '""')}"`,
						`"${(row.description ?? "").replace(/"/g, '""')}"`,
						`"${(row.callToAction ?? "").replace(/"/g, '""')}"`,
						dimMap.clarity ?? "",
						dimMap.valueProposition ?? "",
						dimMap.callToAction ?? "",
						dimMap.brandVoice ?? "",
						dimMap.emotionalResonance ?? "",
						row.weightedScore,
						row.iteration,
					].join(",");
				});

				return new Response([header, ...csvRows].join("\n"), {
					headers: {
						"Content-Type": "text/csv",
						"Content-Disposition": "attachment; filename=evaluations.csv",
					},
				});
			}

			// JSON format - parse dimensions
			const parsed = rows.map((row) => ({
				...row,
				dimensions: JSON.parse(row.dimensions as string),
			}));
			return { evaluations: parsed };
		})
		.get("/iteration-trends", async () => {
			const trends = await db
				.select({
					iteration: iterationLogs.iteration,
					avgScoreBefore: sql<number>`avg(${iterationLogs.scoreBefore})`.as(
						"avg_score_before",
					),
					avgScoreAfter: sql<number>`avg(${iterationLogs.scoreAfter})`.as(
						"avg_score_after",
					),
					count: sql<number>`count(*)`.as("count"),
				})
				.from(iterationLogs)
				.groupBy(iterationLogs.iteration)
				.orderBy(iterationLogs.iteration);

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
