import type {
	AdBrief,
	Evaluation,
	EvaluationDimension,
	GeneratedAd,
} from "../types/index.js";

export const GENERATION_SYSTEM_PROMPT = `You are an expert digital advertising copywriter for Varsity Tutors, a leading online tutoring platform.

Brand: Varsity Tutors
Brand Voice: empowering, knowledgeable, approachable, results-focused
Product: Personalized 1-on-1 online tutoring with expert tutors across all subjects, K-12 through college level.

Key selling points:
- Personalized 1-on-1 tutoring sessions
- Expert tutors vetted for subject mastery
- All subjects from K-12 through college
- Flexible scheduling, learn from anywhere
- Proven results and academic improvement

Your task is to create compelling Facebook/Instagram ad copy. You must produce:
- primaryText: The main ad body (2-4 sentences). Engaging, audience-appropriate, and action-oriented.
- headline: A short, punchy headline (5-10 words).
- description: Supporting text (1 sentence) that reinforces the value proposition.
- callToAction: CTA button text (e.g., "Get Started", "Book Now", "Learn More").

Always match the requested emotional angle, hook style, and body pattern. Write copy that feels authentic, not generic.`;

export function buildGenerationPrompt(brief: AdBrief): string {
	return `Create a Facebook/Instagram ad for the following brief:

Audience: ${brief.audience}
Campaign Goal: ${brief.campaignGoal}
Emotional Angle: ${brief.emotionalAngle}
Hook Style: ${brief.hookStyle}
Body Pattern: ${brief.bodyPattern}
Offer: ${brief.offerType}
Brand Voice: ${brief.brandVoice.join(", ")}
Product: ${brief.product}

Generate ad copy that precisely follows the specified hook style and body pattern while targeting the given audience with the appropriate emotional angle.`;
}

export function buildRegenerationPrompt(
	brief: AdBrief,
	previousAd: GeneratedAd,
	evaluation: Evaluation,
	targetDimension: EvaluationDimension,
): string {
	const dimensionScores = evaluation.dimensions
		.map((d) => `- ${d.dimension}: ${d.score}/10 — ${d.rationale}`)
		.join("\n");

	return `You previously generated the following ad copy, which needs improvement.

PREVIOUS AD:
- Primary Text: ${previousAd.primaryText}
- Headline: ${previousAd.headline}
- Description: ${previousAd.description}
- Call to Action: ${previousAd.callToAction}

EVALUATION SCORES:
${dimensionScores}

WEAKEST DIMENSION: ${targetDimension}

ORIGINAL BRIEF:
Audience: ${brief.audience}
Campaign Goal: ${brief.campaignGoal}
Emotional Angle: ${brief.emotionalAngle}
Hook Style: ${brief.hookStyle}
Body Pattern: ${brief.bodyPattern}
Offer: ${brief.offerType}
Brand Voice: ${brief.brandVoice.join(", ")}
Product: ${brief.product}

Please regenerate the ad copy with a specific focus on improving the "${targetDimension}" dimension while maintaining or improving quality on all other dimensions. Do not sacrifice strengths in other areas.`;
}
