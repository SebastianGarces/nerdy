import { nanoid } from "nanoid";
import { type Browser, chromium } from "playwright";
import type { CompetitorAd } from "../types/index.js";
import { DEFAULT_SCRAPE_CONFIG, buildAdLibraryUrl } from "./config.js";
import type { ScrapeConfig } from "./config.js";
import { SELECTORS } from "./parser.js";

/**
 * Page type alias for Playwright page instances.
 */
type Page = Awaited<ReturnType<Browser["newPage"]>>;

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

	let browser: Browser | null = null;

	try {
		browser = await chromium.launch({ headless: cfg.headless ?? true });
		const ads = await scrapeAdvertiserWithBrowser(browser, advertiser, cfg);
		return ads;
	} catch (err) {
		console.warn(`[scraper] Scraping failed for "${advertiser}":`, err);
		return [];
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

/**
 * Scrape multiple advertisers reusing a single browser instance.
 *
 * This avoids the overhead of launching a new browser per advertiser.
 *
 * @param advertisers - List of company names to search for
 * @param config - Optional scraping configuration overrides
 * @param onProgress - Optional callback invoked after each advertiser completes
 * @returns Array of results per advertiser
 */
export async function scrapeMultipleAdvertisers(
	advertisers: string[],
	config?: ScrapeConfig,
	onProgress?: (advertiser: string, count: number) => void,
): Promise<{ advertiser: string; ads: CompetitorAd[] }[]> {
	const cfg = { ...DEFAULT_SCRAPE_CONFIG, ...config };
	const results: { advertiser: string; ads: CompetitorAd[] }[] = [];

	let browser: Browser | null = null;
	try {
		browser = await chromium.launch({ headless: cfg.headless ?? true });

		for (const advertiser of advertisers) {
			const ads = await scrapeAdvertiserWithBrowser(browser, advertiser, cfg);
			onProgress?.(advertiser, ads.length);
			results.push({ advertiser, ads });
		}
	} finally {
		if (browser) {
			await browser.close();
		}
	}

	return results;
}

/**
 * Core scraping logic for a single advertiser using an existing browser instance.
 */
async function scrapeAdvertiserWithBrowser(
	browser: Browser,
	advertiser: string,
	cfg: ScrapeConfig,
): Promise<CompetitorAd[]> {
	const url = buildAdLibraryUrl(advertiser);
	const ads: CompetitorAd[] = [];

	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	try {
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

		// Extract structured ad data using innerText in the browser context.
		// The regex-based parser failed on Meta's deeply nested DOM, picking up
		// UI chrome like "Open Dropdown" instead of actual ad copy. innerText
		// gives us the visible text in reading order, which we can parse by
		// known boundary markers (e.g. "See summary details").
		const extractedCards = await page.evaluate(
			/* istanbul ignore next -- browser context */
			(selector) => {
				const containers = (globalThis as Record<string, unknown>).document as {
					querySelectorAll(s: string): ArrayLike<unknown>;
				};
				const nodes = containers.querySelectorAll(selector);
				const results: {
					primaryText: string;
					headline: string;
					description: string;
					startDate: string;
					platform: string;
					libraryId: string;
				}[] = [];

				for (const container of Array.from(nodes)) {
					// Walk up to find the card boundary
					let el = container as {
						parentElement: {
							children: ArrayLike<unknown>;
						} | null;
						innerText: string;
					};
					for (let i = 0; i < 10 && el.parentElement; i++) {
						if (el.parentElement.children.length > 5) {
							break;
						}
						el = el.parentElement as unknown as typeof el;
					}

					const text = el.innerText || "";
					const lines = text
						.split("\n")
						.map((l: string) => l.trim())
						.filter(Boolean);

					// Extract start date
					const dateLine = lines.find((l: string) =>
						l.startsWith("Started running on"),
					);
					const startDate = dateLine?.replace("Started running on ", "") || "";

					// Extract Library ID
					const idLine = lines.find((l: string) => l.startsWith("Library ID:"));
					const libraryId = idLine?.replace("Library ID: ", "") || "";

					// Find the ad content boundary markers.
					// The actual ad preview starts after "See summary details"
					// or "See ad details".
					const summaryIdx = lines.findIndex(
						(l: string) =>
							l === "See summary details" || l === "See ad details",
					);

					const adContentLines: string[] = [];
					if (summaryIdx >= 0) {
						for (let i = summaryIdx + 1; i < lines.length; i++) {
							adContentLines.push(lines[i] as string);
						}
					}

					// Filter out noise from ad content
					const noise = new Set([
						"Sponsored",
						"Learn More",
						"Sign Up",
						"Shop Now",
						"Download",
						"Book Now",
						"Contact Us",
						"Get Offer",
						"Subscribe",
						"Watch More",
						"Apply Now",
						"Get Quote",
						"See Menu",
						"Send Message",
					]);

					const meaningful = adContentLines.filter(
						(l: string) =>
							!noise.has(l) &&
							!l.startsWith("HTTPS://") &&
							!l.startsWith("HTTP://") &&
							l.length > 3,
					);

					// First meaningful line is the advertiser/page name (skip it).
					// Second is typically the headline.
					// Everything after is body copy / primary text.
					const headline = meaningful[1] || "";
					const bodyLines = meaningful.slice(2);
					const primaryText = bodyLines.join("\n");

					// Detect platform from full card text
					const platforms: string[] = [];
					if (text.includes("Facebook") || text.includes("facebook"))
						platforms.push("Facebook");
					if (text.includes("Instagram") || text.includes("instagram"))
						platforms.push("Instagram");
					if (text.includes("Messenger") || text.includes("messenger"))
						platforms.push("Messenger");
					if (text.includes("Audience Network"))
						platforms.push("Audience Network");

					results.push({
						primaryText,
						headline,
						description: "",
						startDate,
						platform: platforms.join(", ") || "Facebook",
						libraryId,
					});
				}

				return results;
			},
			adCardSelector,
		);

		const now = new Date().toISOString();
		for (const card of extractedCards) {
			if (!card.headline && !card.primaryText) continue;

			const durationDays = calculateDurationDays(card.startDate);
			ads.push({
				id: nanoid(),
				advertiser,
				primaryText: card.primaryText,
				headline: card.headline,
				description: card.description,
				startDate: card.startDate,
				endDate: "",
				durationDays,
				platform: card.platform,
				scrapedAt: now,
			});
		}
	} finally {
		await context.close();
	}

	return ads;
}

/**
 * Try multiple CSS selectors and return the first one that matches elements.
 */
async function resolveSelector(
	page: Page,
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
