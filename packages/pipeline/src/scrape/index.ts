import { nanoid } from "nanoid";
import { type Browser, chromium } from "playwright";
import type { CompetitorAd } from "../types/index.js";
import { DEFAULT_SCRAPE_CONFIG, buildAdLibraryUrl } from "./config.js";
import type { ScrapeConfig } from "./config.js";
import { SELECTORS } from "./parser.js";

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

/** Minimal DOM element type for browser-context evaluate callbacks. */
type DomEl = {
	parentElement: DomEl | null;
	children: ArrayLike<unknown>;
	innerText: string;
	textContent: string | null;
};

/** Minimal DOM document type for browser-context evaluate callbacks. */
type DomDoc = {
	querySelectorAll(s: string): ArrayLike<DomEl>;
	createTreeWalker(
		root: DomEl,
		whatToShow: number,
	): { nextNode(): DomEl | null };
	body: DomEl;
};

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

		// Wait for ad cards to appear — try the stable data-testid first,
		// then wait for any "Library ID:" text as a fallback signal.
		let hasPrimarySelector = false;
		try {
			await page.waitForSelector(SELECTORS.adCard, { timeout: 5000 });
			hasPrimarySelector = true;
		} catch {
			// Primary selector not found — wait for page content to settle
			await page.waitForTimeout(3000);
		}

		// Check if the page has any ads at all by looking for "Library ID:" text
		const hasAds = await page.evaluate(() => {
			const d = (globalThis as Record<string, unknown>).document as DomDoc;
			return d.body.innerText.includes("Library ID:");
		});

		if (!hasAds) {
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

			const currentCount = hasPrimarySelector
				? await page.locator(SELECTORS.adCard).count()
				: await page.evaluate(() => {
						const d = (globalThis as Record<string, unknown>)
							.document as DomDoc;
						return (d.body.innerText.match(/Library ID:/g) || []).length;
					});
			if (currentCount === previousCount) break;
			previousCount = currentCount;
		}

		// Extract structured ad data using innerText in the browser context.
		// Uses data-testid containers when available, otherwise falls back to
		// finding elements containing "Library ID:" text via JS traversal.
		const extractedCards = await page.evaluate(
			/* istanbul ignore next -- browser context */
			(primarySelector: string) => {
				const doc = (globalThis as Record<string, unknown>).document as DomDoc;

				// Try the primary CSS selector first, fall back to JS text search
				const cardElements: DomEl[] = [];
				const primaryNodes = doc.querySelectorAll(primarySelector);
				if (primaryNodes.length > 0) {
					// Walk up from each data-testid container to the card boundary
					for (const container of Array.from(primaryNodes)) {
						let el: DomEl = container;
						for (let i = 0; i < 10 && el.parentElement; i++) {
							if (el.parentElement.children.length > 5) break;
							el = el.parentElement;
						}
						cardElements.push(el);
					}
				} else {
					// Fallback: find all text nodes containing "Library ID:",
					// walk up to card boundary
					const walker = doc.createTreeWalker(
						doc.body,
						4 /* NodeFilter.SHOW_TEXT */,
					);
					const seen = new Set<DomEl>();
					for (
						let node = walker.nextNode();
						node !== null;
						node = walker.nextNode()
					) {
						if (node.textContent?.includes("Library ID:")) {
							let el: DomEl | null = node.parentElement;
							for (let i = 0; i < 10 && el?.parentElement; i++) {
								if (el.parentElement.children.length > 5) break;
								el = el.parentElement;
							}
							if (el && !seen.has(el)) {
								seen.add(el);
								cardElements.push(el);
							}
						}
					}
				}

				const results: {
					primaryText: string;
					headline: string;
					description: string;
					startDate: string;
					platform: string;
					libraryId: string;
				}[] = [];

				for (const el of cardElements) {
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
			SELECTORS.adCard,
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
