import type { CompetitorAd } from "../types/index.js";

/**
 * Post-processing pipeline for raw scraped Meta Ad Library data.
 * Fixes common quality issues: swapped fields, noise text, duplicates.
 */
export function cleanScrapedAds(ads: CompetitorAd[]): CompetitorAd[] {
	return ads
		.map(cleanSingleAd)
		.filter((ad) => ad.headline || ad.primaryText)
		.filter(deduplicateByHeadlineAndAdvertiser());
}

function cleanSingleAd(ad: CompetitorAd): CompetitorAd {
	let { primaryText, headline } = ad;

	// 1. Strip video timestamps from start of primaryText (e.g. "0:00 / 1:18\n")
	primaryText = primaryText.replace(/^\d+:\d+\s*\/\s*\d+:\d+\n?/, "");

	// 2. Strip "Low impression count" noise from Meta's UI
	primaryText = primaryText.replace(/^Low impression count\n?/i, "");

	// 3. Strip URL-only lines from primaryText
	primaryText = primaryText
		.split("\n")
		.filter((line) => !isUrlLine(line))
		.join("\n")
		.trim();

	// 4. Strip "Sponsored • Paid for by..." from headline
	if (headline.startsWith("Sponsored")) {
		headline = "";
	}

	// 5. Swap headline/primaryText when headline is much longer
	// In Meta ads, the headline is the short punchy line, primaryText is the body
	if (
		headline.length > 0 &&
		primaryText.length > 0 &&
		headline.length > primaryText.length * 2 &&
		primaryText.length < 100
	) {
		const temp = headline;
		headline = primaryText;
		primaryText = temp;
	}

	return { ...ad, primaryText: primaryText.trim(), headline: headline.trim() };
}

function isUrlLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.length === 0) return false;
	// Matches lines that are just a URL or domain
	return (
		/^(HTTPS?:\/\/|WWW\.|[A-Z0-9.-]+\.(COM|ORG|NET|IO|AI|APP))/i.test(
			trimmed,
		) && trimmed.split(/\s+/).length <= 3
	);
}

function deduplicateByHeadlineAndAdvertiser(): (
	ad: CompetitorAd,
	index: number,
	array: CompetitorAd[],
) => boolean {
	const seen = new Set<string>();
	return (ad) => {
		const key = `${ad.advertiser}::${ad.headline}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	};
}
