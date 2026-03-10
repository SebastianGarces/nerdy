import { evaluations, generatedAds, iterationLogs } from "@nerdy/pipeline";
import { asc, eq, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import type { AppDatabase } from "../db.js";

export function adRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/ads" })
		.get(
			"/",
			async ({ query }) => {
				const limit = query.limit ? Number(query.limit) : 20;
				const offset = query.offset ? Number(query.offset) : 0;
				const status = query.status;

				const conditions = status ? eq(generatedAds.status, status) : undefined;

				const ads = await db
					.select()
					.from(generatedAds)
					.where(conditions)
					.limit(limit)
					.offset(offset);

				const [countResult] = await db
					.select({ count: sql<number>`count(*)` })
					.from(generatedAds)
					.where(conditions);

				return {
					ads,
					total: countResult?.count ?? 0,
				};
			},
			{
				query: t.Object({
					limit: t.Optional(t.String()),
					offset: t.Optional(t.String()),
					status: t.Optional(t.String()),
				}),
			},
		)
		.get(
			"/:id",
			async ({ params, set }) => {
				const [ad] = await db
					.select()
					.from(generatedAds)
					.where(eq(generatedAds.id, params.id));

				if (!ad) {
					set.status = 404;
					return { error: "Ad not found" };
				}

				const adEvaluations = await db
					.select()
					.from(evaluations)
					.where(eq(evaluations.adId, params.id));

				const parsedEvaluations = adEvaluations.map((evalRow) => ({
					...evalRow,
					dimensions: JSON.parse(evalRow.dimensions) as unknown[],
				}));

				// Fetch sibling ads (same brief) with their evaluations, ordered by iteration
				const siblings = await db
					.select({
						ad: generatedAds,
						evaluation: evaluations,
					})
					.from(generatedAds)
					.leftJoin(evaluations, eq(evaluations.adId, generatedAds.id))
					.where(eq(generatedAds.briefId, ad.briefId))
					.orderBy(asc(generatedAds.iteration));

				const iterations = siblings.map((row) => ({
					ad: row.ad,
					evaluation: row.evaluation
						? {
								...row.evaluation,
								dimensions: JSON.parse(row.evaluation.dimensions) as unknown[],
							}
						: null,
				}));

				// Fetch iteration logs for this brief
				const logs = await db
					.select()
					.from(iterationLogs)
					.where(eq(iterationLogs.briefId, ad.briefId))
					.orderBy(asc(iterationLogs.iteration));

				return {
					ad,
					evaluations: parsedEvaluations,
					iterations,
					iterationLogs: logs,
				};
			},
			{
				params: t.Object({
					id: t.String(),
				}),
			},
		);
}
