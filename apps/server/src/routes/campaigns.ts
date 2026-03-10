import {
	adBriefs,
	campaigns,
	evaluations,
	generateBriefs,
	generatedAds,
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

				// Generate briefs (using matrix for now; promptToBriefs will be integrated after merge)
				const briefs = generateBriefs(count);

				// Insert briefs with campaignId
				for (const brief of briefs) {
					const briefId = nanoid();
					await db.insert(adBriefs).values({
						id: briefId,
						audience: brief.audience,
						product: brief.product,
						campaignGoal: brief.campaignGoal,
						emotionalAngle: brief.emotionalAngle,
						hookStyle: brief.hookStyle,
						bodyPattern: brief.bodyPattern,
						offerType: brief.offerType,
						brandVoice: JSON.stringify(brief.brandVoice),
						campaignId,
						createdAt: new Date().toISOString(),
					});
				}

				// Get pipeline config
				const config: PipelineConfig = {
					openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
					openRouterBaseUrl:
						process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
					databaseUrl: process.env.DATABASE_URL ?? "./data/nerdy.sqlite",
				};

				// Run pipeline in background (fire-and-forget)
				runPipeline(briefs, config)
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
				const briefs = generateBriefs(count);

				// Insert new briefs with campaignId
				for (const brief of briefs) {
					const briefId = nanoid();
					await db.insert(adBriefs).values({
						id: briefId,
						audience: brief.audience,
						product: brief.product,
						campaignGoal: brief.campaignGoal,
						emotionalAngle: brief.emotionalAngle,
						hookStyle: brief.hookStyle,
						bodyPattern: brief.bodyPattern,
						offerType: brief.offerType,
						brandVoice: JSON.stringify(brief.brandVoice),
						campaignId: params.id,
						createdAt: new Date().toISOString(),
					});
				}

				// Update status
				await db
					.update(campaigns)
					.set({ status: "generating" })
					.where(eq(campaigns.id, params.id));

				const config: PipelineConfig = {
					openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
					openRouterBaseUrl:
						process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
					databaseUrl: process.env.DATABASE_URL ?? "./data/nerdy.sqlite",
				};

				runPipeline(briefs, config)
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
