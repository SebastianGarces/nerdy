import { competitorAds } from "@nerdy/pipeline";
import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import type { AppDatabase } from "../db.js";

export function competitorAdRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/competitor-ads" }).get(
		"/",
		async ({ query }) => {
			const limit = query.limit ? Number(query.limit) : 50;
			const offset = query.offset ? Number(query.offset) : 0;

			const ads = await db
				.select()
				.from(competitorAds)
				.limit(limit)
				.offset(offset);

			const [countResult] = await db
				.select({ count: sql<number>`count(*)` })
				.from(competitorAds);

			return {
				ads,
				total: countResult?.count ?? 0,
			};
		},
		{
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
		},
	);
}
