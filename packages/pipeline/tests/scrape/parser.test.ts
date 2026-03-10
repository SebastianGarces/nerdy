import { describe, expect, it } from "bun:test";
import { SELECTORS, parseAdCard } from "../../src/scrape/parser.js";

// ── Mock HTML snippets representing typical Meta Ad Library card structure ──

const VALID_AD_CARD_HTML = `
<div class="_7jvw" role="article">
  <div class="_7jys">
    <span class="_7jys">Started running on Mar 15, 2026</span>
  </div>
  <div class="_7jyr">
    <div>Struggling with math? Our expert tutors help students achieve A+ grades in just 4 weeks.</div>
  </div>
  <div class="_8jm_">
    <div>Get Expert Math Tutoring Today</div>
  </div>
  <div class="_desc">
    <div>Join 50,000+ students who improved their grades with personalized tutoring sessions.</div>
  </div>
  <div class="_7jyu">
    <span>Facebook</span>
    <span>Instagram</span>
  </div>
</div>
`;

const VALID_AD_CARD_FACEBOOK_ONLY = `
<div class="_7jvw" role="article">
  <div class="_7jys">
    <span>Started running on Jan 10, 2026</span>
  </div>
  <div class="_7jyr">
    <div>Learn to code with our AI-powered platform. Start your free trial today!</div>
  </div>
  <div class="_8jm_">
    <div>AI Coding Bootcamp - Free Trial</div>
  </div>
  <div class="_7jyu">
    <span>Facebook</span>
  </div>
</div>
`;

const MALFORMED_HTML_EMPTY = "";

const MALFORMED_HTML_NO_CONTENT = `
<div class="_7jvw">
  <span>Active</span>
</div>
`;

const NOISE_ONLY_HTML = `
<div class="_7jvw">
  <div>See More</div>
  <div>Learn More</div>
  <div>Sign Up</div>
</div>
`;

const CARD_WITH_MULTIPLE_PLATFORMS = `
<div class="_7jvw" role="article">
  <div><span>Started running on Feb 28, 2026</span></div>
  <div>
    <div>Your child deserves the best education. Personalized learning paths for every student.</div>
  </div>
  <div>
    <div>Personalized Learning for Your Child</div>
  </div>
  <div>
    <div>Award-winning tutoring platform trusted by parents nationwide.</div>
  </div>
  <div>
    <span>Facebook</span>
    <span>Instagram</span>
    <span>Messenger</span>
    <span>Audience Network</span>
  </div>
</div>
`;

// ── Tests ──────────────────────────────────────────────────────────────────

describe("parseAdCard", () => {
	it("parses a valid ad card with date and platforms", () => {
		const result = parseAdCard(VALID_AD_CARD_HTML);
		expect(result).not.toBeNull();
		expect(result?.startDate).toBe("Mar 15, 2026");
		expect(result?.platform).toContain("Facebook");
		expect(result?.platform).toContain("Instagram");
		expect(result?.primaryText.length).toBeGreaterThan(0);
	});

	it("parses a card with only Facebook platform", () => {
		const result = parseAdCard(VALID_AD_CARD_FACEBOOK_ONLY);
		expect(result).not.toBeNull();
		expect(result?.startDate).toBe("Jan 10, 2026");
		expect(result?.platform).toBe("Facebook");
		expect(result?.primaryText).toContain("Learn to code");
	});

	it("extracts multiple platforms and deduplicates them", () => {
		const result = parseAdCard(CARD_WITH_MULTIPLE_PLATFORMS);
		expect(result).not.toBeNull();
		expect(result?.platform).toContain("Facebook");
		expect(result?.platform).toContain("Instagram");
		expect(result?.platform).toContain("Messenger");
		expect(result?.platform).toContain("Audience Network");
	});

	it("returns null for empty HTML", () => {
		const result = parseAdCard(MALFORMED_HTML_EMPTY);
		expect(result).toBeNull();
	});

	it("returns null for card with no meaningful content", () => {
		const result = parseAdCard(MALFORMED_HTML_NO_CONTENT);
		expect(result).toBeNull();
	});

	it("returns null for card containing only noise text", () => {
		const result = parseAdCard(NOISE_ONLY_HTML);
		expect(result).toBeNull();
	});

	it("handles HTML with special entities", () => {
		const htmlWithEntities = `
<div class="_7jvw" role="article">
  <div><span>Started running on Dec 1, 2025</span></div>
  <div><div>Don&apos;t miss out! Save 50% on tutoring &amp; get results you&#39;ll love.</div></div>
  <div><div>Half-Price Tutoring &mdash; Limited Time</div></div>
</div>`;
		const result = parseAdCard(htmlWithEntities);
		expect(result).not.toBeNull();
		expect(result?.startDate).toBe("Dec 1, 2025");
	});
});

describe("SELECTORS", () => {
	it("has expected selector keys", () => {
		expect(SELECTORS.adCard).toBeDefined();
		expect(SELECTORS.adCardFallback).toBeDefined();
	});

	it("uses stable data-testid for primary selector", () => {
		expect(SELECTORS.adCard).toContain("data-testid");
		expect(SELECTORS.adCard).toContain("ad-library-dynamic-content-container");
	});

	it("selectors are non-empty strings", () => {
		for (const [_key, value] of Object.entries(SELECTORS)) {
			expect(typeof value).toBe("string");
			expect(value.length).toBeGreaterThan(0);
		}
	});
});
