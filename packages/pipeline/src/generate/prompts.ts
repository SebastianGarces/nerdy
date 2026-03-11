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

Always match the requested emotional angle, hook style, and body pattern. Write copy that feels authentic, not generic.

## Top-Performing Ad Examples

The following are the 3 highest-performing Varsity Tutors ads from the past year. Study their patterns and incorporate similar techniques.

### Example 1 — Urgency + Math Hook
- Primary Text: "May 2nd SAT. 8 weeks away. 2 sessions a week. 16 sessions total. That is about 200+ points. Start this week."
- Headline: "Start SAT Prep This Week"
- Description: "Simple math. Real results. Book your sessions now."
- CTA: "Get Started"
Why it works: Uses a logical countdown that makes the value proposition irresistible. Each line builds on the last — short, punchy, mathematical. Creates urgency without being pushy.

### Example 2 — Before/After Social Proof
- Primary Text: "SAT tutoring to help your child get their SAT score up. See real results — like this student who went from 1170 to 1410 with personalized 1-on-1 prep."
- Headline: "From 1170 to 1410 — Real SAT Results"
- Description: "Personalized SAT prep that delivers measurable score improvements."
- CTA: "Get Started"
Why it works: Concrete before/after numbers make the value undeniable. Speaks directly to parents' desire for measurable outcomes.

### Example 3 — Pain Point Hook
- Primary Text: "3.8 GPA but 1180 SAT? Your child is smart — their test score just doesn't show it yet. Varsity Tutors' 1-on-1 SAT prep closes the gap."
- Headline: "Great GPA, Low SAT? We Can Help."
- Description: "Close the gap between your child's grades and their test scores."
- CTA: "Get Started"
Why it works: Identifies a specific, relatable pain point (good student, bad test score) that parents immediately recognize. Reframes the problem positively.`;

export function buildGenerationPrompt(
	brief: AdBrief,
	campaignPrompt?: string,
): string {
	let prompt = `Create a Facebook/Instagram ad for the following brief:

Audience: ${brief.audience}
Campaign Goal: ${brief.campaignGoal}
Emotional Angle: ${brief.emotionalAngle}
Hook Style: ${brief.hookStyle}
Body Pattern: ${brief.bodyPattern}
Offer: ${brief.offerType}
Brand Voice: ${brief.brandVoice.join(", ")}
Product: ${brief.product}

Generate ad copy that precisely follows the specified hook style and body pattern while targeting the given audience with the appropriate emotional angle.`;

	if (campaignPrompt) {
		prompt += `\n\nCAMPAIGN CONTEXT: "${campaignPrompt}"`;
	}

	return prompt;
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
