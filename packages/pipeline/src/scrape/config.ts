/**
 * Configuration for the Meta Ad Library scraper.
 */
export interface ScrapeConfig {
	/** Run browser in headless mode (default: true) */
	headless?: boolean;
	/** Milliseconds between scroll attempts (default: 2000) */
	scrollDelay?: number;
	/** Maximum number of scroll attempts to load more ads (default: 10) */
	maxScrollDepth?: number;
	/** Page navigation timeout in milliseconds (default: 30000) */
	pageTimeout?: number;
}

export const DEFAULT_SCRAPE_CONFIG: ScrapeConfig = {
	headless: true,
	scrollDelay: 2000,
	maxScrollDepth: 10,
	pageTimeout: 30000,
};

/**
 * Known competitors in the online tutoring space.
 * Used as default advertisers to scrape from Meta Ad Library.
 */
export const COMPETITORS = [
	"Varsity Tutors",
	"Wyzant",
	"Tutor.com",
	"Khan Academy",
	"Chegg",
	"Kumon",
];

/**
 * Build the Meta Ad Library search URL for a given advertiser.
 */
export function buildAdLibraryUrl(advertiser: string): string {
	const encoded = encodeURIComponent(advertiser);
	return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encoded}&search_type=keyword_unordered`;
}
