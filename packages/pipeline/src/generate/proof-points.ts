export interface ProofPoint {
	claim: string;
	category:
		| "score-improvement"
		| "competitive-comparison"
		| "pricing"
		| "digital-sat"
		| "scholarship"
		| "methodology";
}

export const PROOF_POINTS: ProofPoint[] = [
	// Score improvement
	{
		claim:
			"Our students raise their scores 10X more than students who self-study",
		category: "score-improvement",
	},
	{
		claim:
			"2.6X the score improvement of in-person learning centers, local tutors, and group courses",
		category: "score-improvement",
	},
	{
		claim:
			"At 2 sessions/week with 20 min/day practice, most students see ~100 points/month improvement",
		category: "score-improvement",
	},
	{
		claim: "16 sessions. That's about 200+ points.",
		category: "score-improvement",
	},
	{
		claim:
			"Students starting at 1200 targeting 1400+ should plan for 2 months minimum",
		category: "score-improvement",
	},

	// Competitive comparison
	{
		claim:
			"Princeton Review and Kaplan charge $1,500-$2,500 for group classes — our 1:1 sessions start at $349/mo",
		category: "competitive-comparison",
	},
	{
		claim:
			"Princeton Review/Kaplan charge $199-252/hr for 1:1. Varsity Tutors: as low as $349/mo for a full membership",
		category: "competitive-comparison",
	},
	{
		claim:
			"For what Princeton Review charges for group courses ($1,500-$2,000), we provide 1:1 tutoring",
		category: "competitive-comparison",
	},
	{
		claim:
			"Local tutoring centers charge $80-$200/hr with no platform, no diagnostics, no plan",
		category: "competitive-comparison",
	},

	// Digital SAT mechanics
	{
		claim: "Over 60% of SAT test takers run out of time on each section",
		category: "digital-sat",
	},
	{
		claim:
			"Up to 60% of the math section can be solved with built-in formulas and calculator tools most students don't know exist",
		category: "digital-sat",
	},
	{
		claim:
			"The digital SAT caps your score if you perform poorly in section 1 — strategy matters from question one",
		category: "digital-sat",
	},
	{
		claim:
			"The SAT is 100% digital now — practicing in a digital environment mirrors the actual test",
		category: "digital-sat",
	},

	// Scholarship
	{
		claim: "A 100-point SAT increase can mean $10,000-$40,000 in scholarships",
		category: "scholarship",
	},
	{
		claim:
			"Every SAT point has a dollar value — your child's score determines how much you pay in tuition",
		category: "scholarship",
	},
	{
		claim:
			"Students who score 1400+ take the SAT 3 times on average — super scoring combines the best sections",
		category: "scholarship",
	},

	// Methodology
	{
		claim:
			"We don't guess — we test, we see the data, and we build the plan around what your child specifically needs",
		category: "methodology",
	},
	{
		claim: "Most mid-1200s students are 3-4 targeted fixes away from a 1400+",
		category: "methodology",
	},
	{
		claim:
			"Weekly progress reports showing exactly where your child stands and what they'd likely score today",
		category: "methodology",
	},
];

/**
 * Randomly sample proof points, optionally filtered by category.
 * Returns just the claim strings.
 */
export function getProofPoints(
	count: number,
	category?: ProofPoint["category"],
): string[] {
	const pool = category
		? PROOF_POINTS.filter((p) => p.category === category)
		: PROOF_POINTS;

	if (count <= 0) return [];
	if (count >= pool.length) return pool.map((p) => p.claim);

	// Fisher-Yates shuffle on a copy, then take first `count`
	const shuffled = [...pool];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffled[i] as ProofPoint;
		shuffled[i] = shuffled[j] as ProofPoint;
		shuffled[j] = temp;
	}

	return shuffled.slice(0, count).map((p) => p.claim);
}
