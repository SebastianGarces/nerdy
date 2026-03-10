import { describe, expect, it } from "bun:test";
import {
	COMPETITORS,
	DEFAULT_SCRAPE_CONFIG,
	buildAdLibraryUrl,
} from "../../src/scrape/config.js";

describe("DEFAULT_SCRAPE_CONFIG", () => {
	it("has sensible defaults", () => {
		expect(DEFAULT_SCRAPE_CONFIG.headless).toBe(true);
		expect(DEFAULT_SCRAPE_CONFIG.scrollDelay).toBe(2000);
		expect(DEFAULT_SCRAPE_CONFIG.maxScrollDepth).toBe(10);
		expect(DEFAULT_SCRAPE_CONFIG.pageTimeout).toBe(30000);
	});
});

describe("COMPETITORS", () => {
	it("contains known tutoring competitors", () => {
		expect(COMPETITORS).toContain("Varsity Tutors");
		expect(COMPETITORS).toContain("Wyzant");
		expect(COMPETITORS).toContain("Khan Academy");
		expect(COMPETITORS.length).toBeGreaterThanOrEqual(5);
	});
});

describe("buildAdLibraryUrl", () => {
	it("builds a valid Meta Ad Library URL", () => {
		const url = buildAdLibraryUrl("Varsity Tutors");
		expect(url).toContain("facebook.com/ads/library");
		expect(url).toContain("q=Varsity%20Tutors");
		expect(url).toContain("active_status=active");
		expect(url).toContain("country=US");
	});

	it("encodes special characters in advertiser name", () => {
		const url = buildAdLibraryUrl("Tutor.com");
		expect(url).toContain("q=Tutor.com");
	});

	it("handles ampersands in names", () => {
		const url = buildAdLibraryUrl("Ben & Jerry's");
		expect(url).toContain("q=Ben%20%26%20Jerry's");
	});
});
