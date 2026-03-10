import { generateBriefs, runPipeline } from "@nerdy/pipeline";
import type { AdBrief, PipelineConfig } from "@nerdy/pipeline";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db.js";

export function pipelineRoutes(db: AppDatabase) {
	const jobs = new Map<
		string,
		{
			status: "started" | "completed" | "failed";
			result?: unknown;
			error?: string;
		}
	>();

	return new Elysia({ prefix: "/api/pipeline" })
		.post(
			"/run",
			async ({ body, set }) => {
				const jobId = nanoid();
				let briefs: AdBrief[];

				if (body.briefs && body.briefs.length > 0) {
					briefs = body.briefs as AdBrief[];
				} else {
					const count = body.count ?? 3;
					briefs = generateBriefs(count);
				}

				const config: PipelineConfig = {
					openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
					openRouterBaseUrl:
						process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
				};

				jobs.set(jobId, { status: "started" });

				// Run pipeline in background (fire-and-forget)
				runPipeline(briefs, config, db)
					.then((result) => {
						jobs.set(jobId, { status: "completed", result });
					})
					.catch((error: Error) => {
						jobs.set(jobId, {
							status: "failed",
							error: error.message,
						});
					});

				set.status = 202;
				return {
					jobId,
					status: "started" as const,
					briefCount: briefs.length,
				};
			},
			{
				body: t.Object({
					count: t.Optional(t.Number()),
					briefs: t.Optional(
						t.Array(
							t.Object({
								audience: t.String(),
								product: t.String(),
								campaignGoal: t.String(),
								emotionalAngle: t.String(),
								hookStyle: t.String(),
								bodyPattern: t.String(),
								offerType: t.String(),
								brandVoice: t.Array(t.String()),
							}),
						),
					),
				}),
			},
		)
		.get(
			"/status/:jobId",
			({ params }) => {
				const job = jobs.get(params.jobId);
				if (!job) {
					return { status: "not_found" as const };
				}
				return job;
			},
			{
				params: t.Object({
					jobId: t.String(),
				}),
			},
		);
}
