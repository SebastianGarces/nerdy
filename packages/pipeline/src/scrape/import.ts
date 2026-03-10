import { readFileSync } from "node:fs";
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
 * Returns the count of inserted ads.
 */
export async function importScrapedAds(
	filePath: string,
	db: ReturnType<typeof createDb>,
): Promise<number> {
	const raw = readFileSync(filePath, "utf-8");
	const data: ScrapedAdsFile = JSON.parse(raw);

	for (const ad of data.ads) {
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
	}

	return data.ads.length;
}
