import { describe, expect, test } from "bun:test";
import { cleanScrapedAds } from "../../src/scrape/clean.js";
import type { CompetitorAd } from "../../src/types/index.js";

function makeAd(overrides: Partial<CompetitorAd>): CompetitorAd {
	return {
		id: "test-id",
		advertiser: "Test Co",
		primaryText: "",
		headline: "",
		description: "",
		startDate: "Mar 1, 2026",
		endDate: "",
		durationDays: 1,
		platform: "Facebook",
		scrapedAt: "2026-03-01T00:00:00Z",
		...overrides,
	};
}

describe("cleanScrapedAds", () => {
	test("strips video timestamps from primaryText start", () => {
		const ads = [
			makeAd({
				primaryText: "0:00 / 1:18\nActual ad text here",
				headline: "Buy Now",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.primaryText).toBe("Actual ad text here");
	});

	test("strips shorter video timestamps", () => {
		const ads = [
			makeAd({
				primaryText: "0:00 / 0:30\nShort video ad",
				headline: "Watch",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.primaryText).toBe("Short video ad");
	});

	test('strips "Low impression count" from primaryText start', () => {
		const ads = [
			makeAd({
				primaryText: "Low impression count\nReal ad copy",
				headline: "Headline",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.primaryText).toBe("Real ad copy");
	});

	test("strips URL-only lines from primaryText", () => {
		const ads = [
			makeAd({
				primaryText:
					"Great tutoring service\nWYZANT.COM/TUTORS\nLearn more today",
				headline: "Wyzant",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.primaryText).toBe(
			"Great tutoring service\nLearn more today",
		);
	});

	test("strips various URL formats from primaryText", () => {
		const ads = [
			makeAd({
				primaryText:
					"Line one\nhttps://example.com\nwww.example.org\nITUNES.APPLE.COM\nLine two",
				headline: "Test",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.primaryText).toBe("Line one\nLine two");
	});

	test('strips "Sponsored" headline', () => {
		const ads = [
			makeAd({
				headline: "Sponsored • Paid for by Some Company",
				primaryText: "Ad body text",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.headline).toBe("");
	});

	test("swaps headline/primaryText when headline is much longer", () => {
		const ads = [
			makeAd({
				headline:
					"This is a very long body copy that was incorrectly placed in the headline field by the DOM parser",
				primaryText: "Short Tagline",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.headline).toBe("Short Tagline");
		expect(result[0]?.primaryText).toBe(
			"This is a very long body copy that was incorrectly placed in the headline field by the DOM parser",
		);
	});

	test("does not swap when headline is only slightly longer", () => {
		const ads = [
			makeAd({
				headline: "A reasonable headline",
				primaryText: "Some primary text here",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.headline).toBe("A reasonable headline");
		expect(result[0]?.primaryText).toBe("Some primary text here");
	});

	test("deduplicates by advertiser+headline", () => {
		const ads = [
			makeAd({ id: "1", advertiser: "Wyzant", headline: "Find a Tutor" }),
			makeAd({ id: "2", advertiser: "Wyzant", headline: "Find a Tutor" }),
			makeAd({ id: "3", advertiser: "Wyzant", headline: "Different Headline" }),
			makeAd({ id: "4", advertiser: "Chegg", headline: "Find a Tutor" }),
		];
		const result = cleanScrapedAds(ads);
		expect(result).toHaveLength(3);
		expect(result.map((a) => a.id)).toEqual(["1", "3", "4"]);
	});

	test("drops ads that become empty after cleaning", () => {
		const ads = [
			makeAd({
				headline: "Sponsored • Paid for by X",
				primaryText: "WYZANT.COM",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result).toHaveLength(0);
	});

	test("preserves ads that are already clean", () => {
		const ads = [
			makeAd({
				headline: "Great Tutoring",
				primaryText: "Find the best tutor for your needs.",
				advertiser: "Wyzant",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result).toHaveLength(1);
		expect(result[0]?.headline).toBe("Great Tutoring");
		expect(result[0]?.primaryText).toBe("Find the best tutor for your needs.");
	});

	test("handles multiple cleaning steps on the same ad", () => {
		const ads = [
			makeAd({
				primaryText:
					"0:00 / 0:15\nLow impression count\nBIVENS.PLAINTIP.COM/WEBMD\nActual content",
				headline: "Real Headline",
			}),
		];
		const result = cleanScrapedAds(ads);
		expect(result[0]?.primaryText).toBe("Actual content");
		expect(result[0]?.headline).toBe("Real Headline");
	});
});
