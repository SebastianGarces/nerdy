import { nanoid } from "nanoid";
import { type Browser, chromium } from "playwright";
import type { CompetitorAd } from "../types/index.js";
import { DEFAULT_SCRAPE_CONFIG, buildAdLibraryUrl } from "./config.js";
import type { ScrapeConfig } from "./config.js";
import { SELECTORS, parseAdCard } from "./parser.js";

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

		// Extract ad card HTML by walking up from data-testid containers
		// to their card boundary (the ancestor whose parent is the grid).
		// Uses evaluate with a function arg to pass the selector; the callback
		// runs in the browser context so we suppress DOM type checks via casts.
		const cardHtmls = await page.evaluate(
			/* istanbul ignore next -- browser context */
			(selector) => {
				const containers = (globalThis as Record<string, unknown>).document as {
					querySelectorAll(s: string): ArrayLike<unknown>;
				};
				const nodes = containers.querySelectorAll(selector);
				const results: string[] = [];

				for (const container of Array.from(nodes)) {
					// Walk up to find the card boundary — the ancestor whose
					// parent has many children (the grid container)
					let el = container as {
						parentElement: {
							children: ArrayLike<unknown>;
						} | null;
						outerHTML: string;
					};
					for (let i = 0; i < 10 && el.parentElement; i++) {
						if (el.parentElement.children.length > 5) {
							break;
						}
						el = el.parentElement as unknown as typeof el;
					}
					results.push(el.outerHTML);
				}

				return results;
			},
			adCardSelector,
		);

		const now = new Date().toISOString();

		for (let i = 0; i < cardHtmls.length; i++) {
			try {
				const cardHtml = cardHtmls[i] as string;
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
