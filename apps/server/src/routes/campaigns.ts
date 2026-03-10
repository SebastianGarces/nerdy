import {
	adBriefs,
	campaigns,
	evaluations,
	generatedAds,
	promptToBriefs,
	runPipeline,
} from "@nerdy/pipeline";
import type { PipelineConfig } from "@nerdy/pipeline";
import { desc, eq, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db.js";

export function campaignRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/campaigns" })
		.post(
			"/",
			async ({ body, set }) => {
				const { prompt, count = 3 } = body;
				const campaignId = nanoid();

				// Create campaign row
				await db.insert(campaigns).values({
					id: campaignId,
					name: prompt.slice(0, 80),
					prompt,
					description: prompt,
					status: "generating",
					adCount: count,
					createdAt: new Date().toISOString(),
				});

				// Get pipeline config
				const config: PipelineConfig = {
					openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
					openRouterBaseUrl:
						process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
				};

				// Generate briefs from prompt via LLM
				const briefs = await promptToBriefs(prompt, count, config);

				// Run pipeline in background (fire-and-forget)
				// Pipeline runner inserts briefs with campaignId
				runPipeline(briefs, config, db, {
					campaignId,
					targetCount: count,
					generateMoreBriefs: (n) => promptToBriefs(prompt, n, config),
				})
					.then(async () => {
						await db
							.update(campaigns)
							.set({ status: "completed" })
							.where(eq(campaigns.id, campaignId));
					})
					.catch(async () => {
						await db
							.update(campaigns)
							.set({ status: "failed" })
							.where(eq(campaigns.id, campaignId));
					});

				set.status = 202;
				return { id: campaignId, status: "generating" };
			},
			{
				body: t.Object({
					prompt: t.String(),
					count: t.Optional(t.Number()),
				}),
			},
		)

		.get("/", async () => {
			const result = await db
				.select()
				.from(campaigns)
				.orderBy(desc(campaigns.createdAt));

			return { campaigns: result };
		})

		.get(
			"/:id",
			async ({ params, set }) => {
				const [campaign] = await db
					.select()
					.from(campaigns)
					.where(eq(campaigns.id, params.id));

				if (!campaign) {
					set.status = 404;
					return { error: "Campaign not found" };
				}

				// Get briefs for this campaign
				const briefRows = await db
					.select()
					.from(adBriefs)
					.where(eq(adBriefs.campaignId, params.id));

				// Get ads for those briefs
				const briefIds = briefRows.map((b) => b.id);
				let ads: Array<Record<string, unknown>> = [];
				if (briefIds.length > 0) {
					ads = await db
						.select()
						.from(generatedAds)
						.where(
							sql`${generatedAds.briefId} IN (${sql.join(
								briefIds.map((id) => sql`${id}`),
								sql`, `,
							)})`,
						);
				}

				// Get evaluations for those ads
				const adIds = ads.map((a) => a.id as string);
				let evals: Array<Record<string, unknown>> = [];
				if (adIds.length > 0) {
					const rawEvals = await db
						.select()
						.from(evaluations)
						.where(
							sql`${evaluations.adId} IN (${sql.join(
								adIds.map((id) => sql`${id}`),
								sql`, `,
							)})`,
						);
					evals = rawEvals.map((e) => ({
						...e,
						dimensions: JSON.parse(e.dimensions as string),
					}));
				}

				return {
					campaign,
					briefs: briefRows,
					ads,
					evaluations: evals,
				};
			},
			{
				params: t.Object({
					id: t.String(),
				}),
			},
		)

		.get(
			"/:id/export",
			async ({ params, query, set }) => {
				const format = query.format ?? "json";

				const [campaign] = await db
					.select()
					.from(campaigns)
					.where(eq(campaigns.id, params.id));

				if (!campaign) {
					set.status = 404;
					return { error: "Campaign not found" };
				}

				// Get briefs for this campaign
				const briefRows = await db
					.select()
					.from(adBriefs)
					.where(eq(adBriefs.campaignId, params.id));

				const briefIds = briefRows.map((b) => b.id);
				if (briefIds.length === 0) {
					if (format === "csv") {
						return new Response("No data", {
							headers: { "Content-Type": "text/csv" },
						});
					}
					return { evaluations: [] };
				}

				// Get ads for those briefs, joined with evaluations
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
					.innerJoin(
						generatedAds,
						sql`${evaluations.adId} = ${generatedAds.id}`,
					)
					.where(
						sql`${generatedAds.briefId} IN (${sql.join(
							briefIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					);

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
							"Content-Disposition": `attachment; filename=campaign-${params.id}.csv`,
						},
					});
				}

				const parsed = rows.map((row) => ({
					...row,
					dimensions: JSON.parse(row.dimensions as string),
				}));
				return { evaluations: parsed };
			},
			{
				params: t.Object({
					id: t.String(),
				}),
			},
		)

		.post(
			"/:id/generate",
			async ({ params, set }) => {
				const [campaign] = await db
					.select()
					.from(campaigns)
					.where(eq(campaigns.id, params.id));

				if (!campaign) {
					set.status = 404;
					return { error: "Campaign not found" };
				}

				const count = campaign.adCount;

				const config: PipelineConfig = {
					openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
					openRouterBaseUrl:
						process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
				};

				// Generate briefs from prompt via LLM
				const briefs = await promptToBriefs(campaign.prompt, count, config);

				// Update status
				await db
					.update(campaigns)
					.set({ status: "generating" })
					.where(eq(campaigns.id, params.id));

				// Pipeline runner inserts briefs with campaignId
				runPipeline(briefs, config, db, {
					campaignId: params.id,
					targetCount: count,
					generateMoreBriefs: (n) => promptToBriefs(campaign.prompt, n, config),
				})
					.then(async () => {
						await db
							.update(campaigns)
							.set({ status: "completed" })
							.where(eq(campaigns.id, params.id));
					})
					.catch(async () => {
						await db
							.update(campaigns)
							.set({ status: "failed" })
							.where(eq(campaigns.id, params.id));
					});

				set.status = 202;
				return { id: params.id, status: "generating" };
			},
			{
				params: t.Object({
					id: t.String(),
				}),
			},
		);
}
