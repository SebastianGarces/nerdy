import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import type { createDb } from "../db/index.js";
import { competitorAds } from "../db/schema.js";
import type { CompetitorAd } from "../types/index.js";

interface ScrapedAdsFile {
	scrapedAt: string;
	advertisers: string[];
	totalAdsRaw: number;
	totalAds: number;
	ads: CompetitorAd[];
}

/**
 * Import scraped ads from a JSON file into the database.
 * Deduplicates by advertiser+headline composite key.
 * If a duplicate exists with a shorter durationDays, updates it.
 * Returns the count of newly inserted ads.
 */
export async function importScrapedAds(
	filePath: string,
	db: ReturnType<typeof createDb>,
): Promise<number> {
	const raw = readFileSync(filePath, "utf-8");
	const data: ScrapedAdsFile = JSON.parse(raw);

	// Load existing ads and build dedup set
	const existing = db.select().from(competitorAds).all();
	const existingMap = new Map<string, (typeof existing)[number]>();
	for (const row of existing) {
		const key = `${row.advertiser}::${row.headline}`;
		existingMap.set(key, row);
	}

	let insertedCount = 0;

	for (const ad of data.ads) {
		const key = `${ad.advertiser}::${ad.headline}`;
		const existingAd = existingMap.get(key);

		if (existingAd) {
			// Update if new ad has longer duration
			if (ad.durationDays > existingAd.durationDays) {
				db.update(competitorAds)
					.set({
						durationDays: ad.durationDays,
						endDate: ad.endDate,
						scrapedAt: ad.scrapedAt,
					})
					.where(eq(competitorAds.id, existingAd.id))
					.run();
			}
			// Skip insert — it's a duplicate
			continue;
		}

		db.insert(competitorAds)
			.values({
				id: ad.id,
				advertiser: ad.advertiser,
				primaryText: ad.primaryText,
				headline: ad.headline,
				description: ad.description,
				startDate: ad.startDate,
				endDate: ad.endDate,
				durationDays: ad.durationDays,
				platform: ad.platform,
				scrapedAt: ad.scrapedAt,
			})
			.run();

		existingMap.set(key, ad as unknown as (typeof existing)[number]);
		insertedCount++;
	}

	return insertedCount;
}
