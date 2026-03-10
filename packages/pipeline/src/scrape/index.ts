import { nanoid } from "nanoid";
import { chromium } from "playwright";
import type { CompetitorAd } from "../types/index.js";
import { DEFAULT_SCRAPE_CONFIG, buildAdLibraryUrl } from "./config.js";
import type { ScrapeConfig } from "./config.js";
import { SELECTORS, parseAdCard } from "./parser.js";

/**
 * Scrape competitor ads from Meta Ad Library for a given advertiser.
 *
 * Launches a headless Chromium browser, navigates to Meta's public Ad Library,
 * scrolls to load ads, and extracts structured data from each ad card.
 *
 * @param advertiser - Company name to search for (e.g. "Varsity Tutors")
 * @param config - Optional scraping configuration overrides
 * @returns Array of parsed competitor ads (empty array on failure)
 */
export async function scrapeCompetitorAds(
	advertiser: string,
	config?: ScrapeConfig,
): Promise<CompetitorAd[]> {
	const cfg = { ...DEFAULT_SCRAPE_CONFIG, ...config };
	const url = buildAdLibraryUrl(advertiser);
	const ads: CompetitorAd[] = [];

	let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

	try {
		browser = await chromium.launch({ headless: cfg.headless ?? true });
		const context = await browser.newContext({
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		});
		const page = await context.newPage();

		// Navigate to Ad Library
		await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: cfg.pageTimeout ?? 30000,
		});

		// Wait for ad cards to appear (try primary selector, then fallback)
		const adCardSelector = await resolveSelector(page, [
			SELECTORS.adCard,
			SELECTORS.adCardFallback,
		]);

		if (!adCardSelector) {
			console.warn(
				`[scraper] No ad cards found for "${advertiser}". The page may have changed structure or there are no active ads.`,
			);
			return [];
		}

		// Scroll to load more ads
		let previousCount = 0;
		for (let i = 0; i < (cfg.maxScrollDepth ?? 10); i++) {
			await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
			await page.waitForTimeout(cfg.scrollDelay ?? 2000);

			const currentCount = await page.locator(adCardSelector).count();
			if (currentCount === previousCount) {
				// No new ads loaded, stop scrolling
				break;
			}
			previousCount = currentCount;
		}

		// Extract ad cards
		const cardElements = page.locator(adCardSelector);
		const count = await cardElements.count();

		const now = new Date().toISOString();

		for (let i = 0; i < count; i++) {
			try {
				const cardHtml = await cardElements.nth(i).innerHTML();
				const parsed = parseAdCard(cardHtml);

				if (!parsed) continue;

				const durationDays = calculateDurationDays(parsed.startDate);

				ads.push({
					id: nanoid(),
					advertiser,
					primaryText: parsed.primaryText,
					headline: parsed.headline,
					description: parsed.description,
					startDate: parsed.startDate,
					endDate: "", // Active ads have no end date
					durationDays,
					platform: parsed.platform,
					scrapedAt: now,
				});
			} catch (err) {
				// Skip individual cards that fail to parse
				console.warn(`[scraper] Failed to parse card ${i}:`, err);
			}
		}
	} catch (err) {
		console.warn(`[scraper] Scraping failed for "${advertiser}":`, err);
		return [];
	} finally {
		if (browser) {
			await browser.close();
		}
	}

	return ads;
}

/**
 * Try multiple CSS selectors and return the first one that matches elements.
 */
async function resolveSelector(
	page: Awaited<
		ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>
	>,
	selectors: string[],
): Promise<string | null> {
	for (const selector of selectors) {
		try {
			await page.waitForSelector(selector, { timeout: 5000 });
			return selector;
		} catch {
			// Try next selector
		}
	}
	return null;
}

/**
 * Calculate the number of days an ad has been running from its start date to now.
 */
function calculateDurationDays(startDateStr: string): number {
	if (!startDateStr) return 0;

	try {
		const start = new Date(startDateStr);
		if (Number.isNaN(start.getTime())) return 0;

		const now = new Date();
		const diffMs = now.getTime() - start.getTime();
		return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
	} catch {
		return 0;
	}
}
