import { describe, expect, test } from "bun:test";
import { generateBriefs } from "../../src/generate/briefs.js";

describe("generateBriefs", () => {
	test("returns requested number of briefs", () => {
		const briefs = generateBriefs(10);
		expect(briefs).toHaveLength(10);
	});

	test("returns empty array for count 0", () => {
		const briefs = generateBriefs(0);
		expect(briefs).toHaveLength(0);
	});

	test("returns empty array for negative count", () => {
		const briefs = generateBriefs(-5);
		expect(briefs).toHaveLength(0);
	});

	test("all briefs have valid audience values", () => {
		const briefs = generateBriefs(50);
		const validAudiences = ["parent", "student", "family"];
		for (const brief of briefs) {
			expect(validAudiences).toContain(brief.audience);
		}
	});

	test("all briefs have valid campaign goal values", () => {
		const briefs = generateBriefs(50);
		const validGoals = ["awareness", "conversion"];
		for (const brief of briefs) {
			expect(validGoals).toContain(brief.campaignGoal);
		}
	});

	test("all briefs have valid emotional angle values", () => {
		const briefs = generateBriefs(50);
		const validAngles = [
			"aspiration",
			"anxiety-relief",
			"social-proof",
			"urgency",
		];
		for (const brief of briefs) {
			expect(validAngles).toContain(brief.emotionalAngle);
		}
	});

	test("all briefs have valid hook style values", () => {
		const briefs = generateBriefs(50);
		const validHooks = ["question", "stat", "story", "fear"];
		for (const brief of briefs) {
			expect(validHooks).toContain(brief.hookStyle);
		}
	});

	test("all briefs have valid body pattern values", () => {
		const briefs = generateBriefs(50);
		const validPatterns = [
			"problem-agitate-solution",
			"testimonial-benefit",
			"stat-context-offer",
		];
		for (const brief of briefs) {
			expect(validPatterns).toContain(brief.bodyPattern);
		}
	});

	test("product is always Varsity Tutors", () => {
		const briefs = generateBriefs(20);
		for (const brief of briefs) {
			expect(brief.product).toBe("Varsity Tutors");
		}
	});

	test("brand voice is always the same", () => {
		const expectedVoice = [
			"empowering",
			"knowledgeable",
			"approachable",
			"results-focused",
		];
		const briefs = generateBriefs(20);
		for (const brief of briefs) {
			expect(brief.brandVoice).toEqual(expectedVoice);
		}
	});

	test("no duplicate briefs for count within matrix size", () => {
		const briefs = generateBriefs(100);
		const serialized = briefs.map((b) =>
			JSON.stringify({
				audience: b.audience,
				campaignGoal: b.campaignGoal,
				emotionalAngle: b.emotionalAngle,
				hookStyle: b.hookStyle,
				bodyPattern: b.bodyPattern,
				offerType: b.offerType,
			}),
		);
		const unique = new Set(serialized);
		expect(unique.size).toBe(100);
	});

	test("covers all audiences across sufficient sample", () => {
		const briefs = generateBriefs(100);
		const audiences = new Set(briefs.map((b) => b.audience));
		expect(audiences.has("parent")).toBe(true);
		expect(audiences.has("student")).toBe(true);
		expect(audiences.has("family")).toBe(true);
	});

	test("caps at total matrix size (1152)", () => {
		const briefs = generateBriefs(2000);
		expect(briefs).toHaveLength(1152);
	});

	test("total matrix size is 1152", () => {
		// 3 audiences × 2 goals × 4 emotions × 4 hooks × 3 bodies × 4 offers
		const briefs = generateBriefs(1152);
		expect(briefs).toHaveLength(1152);
	});

	test("all briefs have a persona assigned", () => {
		const briefs = generateBriefs(50);
		for (const brief of briefs) {
			expect(brief.persona).toBeString();
			expect(brief.persona?.length).toBeGreaterThan(0);
		}
	});

	test("all briefs have proof points from real data", () => {
		const briefs = generateBriefs(20);
		for (const brief of briefs) {
			expect(brief.proofPoints).toBeDefined();
			expect(brief.proofPoints?.length).toBe(3);
			for (const point of brief.proofPoints ?? []) {
				expect(point).toBeString();
				expect(point.length).toBeGreaterThan(0);
			}
		}
	});

	test("personas cycle across all 7 values", () => {
		const briefs = generateBriefs(100);
		const personas = new Set(briefs.map((b) => b.persona));
		expect(personas.size).toBe(7);
	});
});
