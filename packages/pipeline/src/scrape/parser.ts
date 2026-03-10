/**
 * DOM extraction logic for Meta Ad Library cards.
 *
 * NOTE: Meta Ad Library selectors change frequently. These selectors
 * are based on the observed structure as of early 2026 and may need
 * updating when Meta updates their UI. The parser is intentionally
 * isolated in this module to make updates straightforward.
 */

export interface RawAdData {
	primaryText: string;
	headline: string;
	description: string;
	startDate: string;
	platform: string;
}

/**
 * CSS selectors for Meta Ad Library page elements.
 * These target the public Ad Library interface at facebook.com/ads/library.
 *
 * Meta frequently changes class names and structure. When scraping breaks,
 * update these selectors based on the current DOM structure.
 */
export const SELECTORS = {
	/** Container for each individual ad card - uses stable data-testid */
	adCard: '[data-testid="ad-library-dynamic-content-container"]',
	/** Fallback: broader container selector (valid native CSS) */
	adCardFallback: 'div[class] > div[class] > div[class]',
} as const;

/**
 * Regex patterns for extracting data from HTML strings.
 */
const DATE_PATTERN = /Started running on\s+(\w+\s+\d{1,2},?\s+\d{4})/i;
const PLATFORM_PATTERN =
	/\b(Facebook|Instagram|Messenger|Audience Network)\b/gi;

/**
 * Strip HTML tags and decode common entities, returning clean text.
 */
function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Parse a single ad card's HTML to extract ad fields.
 *
 * Uses regex-based extraction on the raw HTML string rather than
 * a full DOM parser, keeping dependencies minimal.
 *
 * @param cardHtml - The outer HTML of a single ad card element
 * @returns Parsed ad data, or null if the card cannot be meaningfully parsed
 */
export function parseAdCard(cardHtml: string): RawAdData | null {
	if (!cardHtml || cardHtml.trim().length === 0) {
		return null;
	}

	// Extract date — this is our strongest signal the card is a real ad
	const dateMatch = cardHtml.match(DATE_PATTERN);
	const startDate = dateMatch?.[1] ?? "";

	// Extract platforms mentioned
	const platformMatches = cardHtml.match(PLATFORM_PATTERN);
	const platforms = platformMatches
		? [...new Set(platformMatches.map((p) => p.trim()))].join(", ")
		: "Facebook";

	// Try to extract structured text blocks.
	// Meta cards typically have: primary text, then headline, then description/CTA.
	// We look for text content in div blocks, filtering out noise.
	const textBlocks = extractTextBlocks(cardHtml);

	if (textBlocks.length === 0 && !startDate) {
		// No usable content
		return null;
	}

	const primaryText = textBlocks[0] ?? "";
	const headline = textBlocks[1] ?? "";
	const description = textBlocks[2] ?? "";

	// Require at least some text content
	if (!primaryText && !headline) {
		return null;
	}

	return {
		primaryText,
		headline,
		description,
		startDate,
		platform: platforms,
	};
}

/**
 * Extract meaningful text blocks from card HTML.
 * Filters out very short strings (navigation, icons) and deduplicates.
 */
function extractTextBlocks(html: string): string[] {
	// Split by major div boundaries to find text sections
	const divContents = html.match(/<div[^>]*>([^<]+)<\/div>/gi) ?? [];

	const texts: string[] = [];
	const seen = new Set<string>();

	for (const div of divContents) {
		const text = stripHtml(div);
		// Filter noise: too short, duplicates, or looks like a button/link label
		if (text.length > 10 && !seen.has(text) && !isNoise(text)) {
			seen.add(text);
			texts.push(text);
		}
	}

	return texts;
}

/**
 * Heuristic: skip text that looks like UI chrome rather than ad content.
 */
function isNoise(text: string): boolean {
	const noisePatterns = [
		/^see (more|less|all)$/i,
		/^learn more$/i,
		/^sign up$/i,
		/^shop now$/i,
		/^about this ad$/i,
		/^ad library$/i,
		/^see ad details$/i,
		/^started running on/i,
		/^active$/i,
		/^inactive$/i,
	];
	return noisePatterns.some((p) => p.test(text.trim()));
}
