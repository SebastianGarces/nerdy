import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	adBriefs,
	evaluations,
	generatedAds,
	iterationLogs,
	tokenUsage,
} from "@nerdy/pipeline";
import { asc, eq, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db.js";

function buildImagePrompt(
	ad: {
		headline: string;
		primaryText: string;
		description: string;
		callToAction: string;
	},
	brief: {
		audience: string;
		emotionalAngle: string;
		campaignGoal: string;
	},
) {
	return `Create a photo-realistic Facebook ad image for an online tutoring company.

CRITICAL RULE — NO LOGOS OR BRAND NAMES:
You MUST NOT include any logo, wordmark, emblem, brand name, company name, or text that says "Varsity Tutors" or any other brand anywhere in the image. The logo is composited separately — if you render one it WILL be wrong and the image will be rejected. This is the #1 most important rule.

AD CONTEXT (for mood/tone only — do NOT render this text in the image):
- Headline: ${ad.headline}
- Description: ${ad.description}
- Target audience: ${brief.audience}
- Emotional angle: ${brief.emotionalAngle}
- Campaign goal: ${brief.campaignGoal}

WHAT TO INCLUDE:
- The headline text "${ad.headline}" displayed prominently as the main text overlay
- Photo-realistic imagery of students, tutors, books, or academic settings appropriate to the ad context
- Brand color palette: navy blue (#3a53a2), coral/red (#ff616e), light blue (#8fcbe0)
- Clean, modern, professional feel — aspirational education imagery
- 4:5 portrait aspect ratio (1024x1280)

WHAT TO EXCLUDE (will cause rejection):
- Any logo, seal, emblem, or brand mark
- Any text saying "Varsity Tutors" or any company/brand name
- The primary text or CTA button (those are rendered outside the image)
- Any watermarks or badges`;
}

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
		)
		.post(
			"/:id/generate-image",
			async ({ params, set }) => {
				// Validate ad exists
				const [ad] = await db
					.select()
					.from(generatedAds)
					.where(eq(generatedAds.id, params.id));

				if (!ad) {
					set.status = 404;
					return { error: "Ad not found" };
				}

				// Validate ad is approved
				if (ad.status !== "approved") {
					set.status = 400;
					return {
						error: "Only approved ads can have images generated",
					};
				}

				// Fetch the brief for context
				const [brief] = await db
					.select()
					.from(adBriefs)
					.where(eq(adBriefs.id, ad.briefId));

				if (!brief) {
					set.status = 500;
					return { error: "Associated brief not found" };
				}

				// Check for API key
				const apiKey = process.env.OPENROUTER_API_KEY;
				if (!apiKey) {
					set.status = 500;
					return { error: "OPENROUTER_API_KEY not configured" };
				}

				// Build prompt
				const prompt = buildImagePrompt(ad, brief);

				// Call OpenRouter API
				const model = "google/gemini-3.1-flash-image-preview";
				let apiResponse: Response;
				try {
					apiResponse = await fetch(
						"https://openrouter.ai/api/v1/chat/completions",
						{
							method: "POST",
							headers: {
								Authorization: `Bearer ${apiKey}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								model,
								messages: [
									{
										role: "user",
										content: prompt,
									},
								],
								modalities: ["image", "text"],
							}),
						},
					);
				} catch (err) {
					set.status = 502;
					return {
						error: "Failed to reach image generation API",
					};
				}

				if (!apiResponse.ok) {
					const errorBody = await apiResponse.text();
					console.error(
						`Image generation API error ${apiResponse.status}:`,
						errorBody,
					);
					set.status = 502;
					return {
						error: `Image generation API returned ${apiResponse.status}`,
						details: errorBody,
					};
				}

				const responseBody = (await apiResponse.json()) as {
					choices?: Array<{
						message?: {
							content?:
								| string
								| Array<{
										type: string;
										image_url?: { url: string };
								  }>;
							images?: Array<{
								type: string;
								image_url?: { url: string };
							}>;
						};
					}>;
					usage?: {
						prompt_tokens?: number;
						completion_tokens?: number;
						total_tokens?: number;
					};
				};

				// Extract base64 image from response
				// OpenRouter returns images in message.images[] or inline in content[]
				const message = responseBody.choices?.[0]?.message;
				let base64Data: string | null = null;

				// Check message.images first (OpenRouter standard)
				if (message?.images) {
					for (const img of message.images) {
						const url = img.image_url?.url;
						if (url?.startsWith("data:image/")) {
							base64Data = url.replace(/^data:image\/\w+;base64,/, "");
							break;
						}
					}
				}

				// Fallback: check content array
				if (!base64Data && Array.isArray(message?.content)) {
					for (const part of message.content) {
						const url = part.image_url?.url;
						if (part.type === "image_url" && url?.startsWith("data:image/")) {
							base64Data = url.replace(/^data:image\/\w+;base64,/, "");
							break;
						}
					}
				}

				if (!base64Data) {
					set.status = 502;
					return {
						error: "No image found in API response",
					};
				}

				// Save image to disk
				const imageDir = resolve(import.meta.dir, "../../data/images");
				if (!existsSync(imageDir)) {
					mkdirSync(imageDir, { recursive: true });
				}

				const imageFileName = `${params.id}.png`;
				const imagePath = resolve(imageDir, imageFileName);
				const imageBuffer = Buffer.from(base64Data, "base64");
				writeFileSync(imagePath, imageBuffer);

				// Update database
				const imageUrl = `/images/${imageFileName}`;
				await db
					.update(generatedAds)
					.set({ imageUrl: imageUrl })
					.where(eq(generatedAds.id, params.id));

				// Track token usage
				const promptTokens = responseBody.usage?.prompt_tokens ?? 0;
				const completionTokens = responseBody.usage?.completion_tokens ?? 0;
				const totalTokens =
					responseBody.usage?.total_tokens ?? promptTokens + completionTokens;

				await db.insert(tokenUsage).values({
					id: nanoid(),
					operation: "image_generation",
					model,
					promptTokens,
					completionTokens,
					totalTokens,
					costUsd: 0.09,
					createdAt: new Date().toISOString(),
				});

				return { imageUrl };
			},
			{
				params: t.Object({
					id: t.String(),
				}),
			},
		);
}
