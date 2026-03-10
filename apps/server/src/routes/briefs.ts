import { adBriefs, generateBriefs } from "@nerdy/pipeline";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db.js";

export function briefRoutes(db: AppDatabase) {
	return new Elysia({ prefix: "/api/briefs" })
		.get("/", async () => {
			const briefs = await db.select().from(adBriefs);
			return { briefs };
		})
		.post(
			"/generate",
			async ({ body }) => {
				const count = body.count ?? 5;
				const briefs = generateBriefs(count);

				const inserted = [];
				for (const brief of briefs) {
					const id = nanoid();
					const row = {
						id,
						audience: brief.audience,
						product: brief.product,
						campaignGoal: brief.campaignGoal,
						emotionalAngle: brief.emotionalAngle,
						hookStyle: brief.hookStyle,
						bodyPattern: brief.bodyPattern,
						offerType: brief.offerType,
						brandVoice: JSON.stringify(brief.brandVoice),
						createdAt: new Date().toISOString(),
					};
					await db.insert(adBriefs).values(row);
					inserted.push(row);
				}

				return { briefs: inserted };
			},
			{
				body: t.Object({
					count: t.Optional(t.Number()),
				}),
			},
		);
}
