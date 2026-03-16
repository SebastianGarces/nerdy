import type { AdBrief } from "../types/index.js";
import { PERSONA_IDS } from "./personas.js";
import { getProofPoints } from "./proof-points.js";

const AUDIENCES = ["parent", "student", "family"] as const;
const GOALS = ["awareness", "conversion"] as const;
const EMOTIONS = [
	"aspiration",
	"anxiety-relief",
	"social-proof",
	"urgency",
] as const;
const HOOKS = ["question", "stat", "story", "fear"] as const;
const BODIES = [
	"problem-agitate-solution",
	"testimonial-benefit",
	"stat-context-offer",
] as const;
const OFFERS = [
	"Free diagnostic",
	"Free practice test",
	"Book Diagnostic",
	"Talk to an SAT specialist",
] as const;

const BRAND_VOICE = [
	"empowering",
	"knowledgeable",
	"approachable",
	"results-focused",
];
const PRODUCT = "Varsity Tutors";

function generateAllCombinations(): AdBrief[] {
	const combos: AdBrief[] = [];
	let personaIndex = 0;
	for (const audience of AUDIENCES) {
		for (const campaignGoal of GOALS) {
			for (const emotionalAngle of EMOTIONS) {
				for (const hookStyle of HOOKS) {
					for (const bodyPattern of BODIES) {
						for (const offerType of OFFERS) {
							combos.push({
								audience,
								product: PRODUCT,
								campaignGoal,
								emotionalAngle,
								hookStyle,
								bodyPattern,
								offerType,
								brandVoice: [...BRAND_VOICE],
								proofPoints: getProofPoints(3),
								persona: PERSONA_IDS[personaIndex % PERSONA_IDS.length],
							});
							personaIndex++;
						}
					}
				}
			}
		}
	}
	return combos;
}

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = arr[i];
		arr[i] = arr[j] as T;
		arr[j] = temp as T;
	}
	return arr;
}

/**
 * Generate a set of unique ad briefs from the combinatorial matrix.
 * Returns up to `count` unique briefs (max 1152 total combinations).
 */
export function generateBriefs(count: number): AdBrief[] {
	if (count <= 0) return [];
	const all = generateAllCombinations();
	shuffle(all);
	return all.slice(0, count);
}
