import { describe, expect, test } from "bun:test";
import {
	PROOF_POINTS,
	type ProofPoint,
	getProofPoints,
} from "../../src/generate/proof-points";

const VALID_CATEGORIES: ProofPoint["category"][] = [
	"score-improvement",
	"competitive-comparison",
	"pricing",
	"digital-sat",
	"scholarship",
	"methodology",
];

describe("PROOF_POINTS", () => {
	test("all proof points have non-empty claims", () => {
		for (const pp of PROOF_POINTS) {
			expect(pp.claim.length).toBeGreaterThan(0);
		}
	});

	test("all proof points have valid categories", () => {
		for (const pp of PROOF_POINTS) {
			expect(VALID_CATEGORIES).toContain(pp.category);
		}
	});
});

describe("getProofPoints", () => {
	test("returns the correct count", () => {
		const result = getProofPoints(3);
		expect(result).toHaveLength(3);
	});

	test("category filtering works", () => {
		const result = getProofPoints(2, "scholarship");
		expect(result).toHaveLength(2);

		const allScholarship = PROOF_POINTS.filter(
			(p) => p.category === "scholarship",
		).map((p) => p.claim);

		for (const claim of result) {
			expect(allScholarship).toContain(claim);
		}
	});

	test("returns empty array for count 0", () => {
		expect(getProofPoints(0)).toEqual([]);
	});

	test("requesting more than available returns all available", () => {
		const methodologyCount = PROOF_POINTS.filter(
			(p) => p.category === "methodology",
		).length;

		const result = getProofPoints(100, "methodology");
		expect(result).toHaveLength(methodologyCount);
	});

	test("returns strings, not ProofPoint objects", () => {
		const result = getProofPoints(1);
		expect(typeof result[0]).toBe("string");
	});
});
