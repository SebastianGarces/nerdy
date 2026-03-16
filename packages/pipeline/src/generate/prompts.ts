import type { AdBrief, Evaluation, GeneratedAd } from "../types/index.js";

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
Why it works: Identifies a specific, relatable pain point (good student, bad test score) that parents immediately recognize. Reframes the problem positively.

## Writing Principles

1. **Use specific numbers.** Strong ads contain specific numbers (score improvements, session counts, time frames, percentages). Use concrete claims when available.
2. **Short, punchy sentences.** Prefer sentence fragments. Max 12 words per sentence in primaryText. The best ads read like a countdown or logical proof.
3. **Mathematical/logical structure.** When the brief calls for it, consider mathematical or logical build-up where each line follows from the last: "X weeks. Y sessions/week. Z total. That's N+ points."
4. **Before/after framing.** Use concrete before/after pairs (e.g., "1170 → 1410") or gap framing (e.g., "3.8 GPA but 1180 SAT?").
5. **Banned filler phrases.** Never use: "unlock your potential", "journey to success", "take the first step", "invest in your future", "don't wait", "empower your child".

## Varsity Tutors Messaging Rules

These rules come directly from Varsity Tutors brand guidelines and override any conflicting patterns.

### Language Rules
- ALWAYS say "your child" — NEVER say "your student". Parents think of them as their children, not their students.
- Say "SAT tutoring" — NOT "SAT prep".
- NEVER position us as "online tutoring" — parents will dismiss us before we can make the case. Instead, emphasize 1-on-1 and the digital SAT environment advantage.

### Banned Patterns — Fake Scarcity
Never use fake urgency or scarcity tactics: "spots filling fast", "limited enrollment", "secure their spot", "don't miss out".
Instead, use REAL calendar urgency: test dates, college application deadlines, weeks remaining, number of sessions possible before the test.

### Banned Patterns — Corporate/Marketing Speak
Parents don't talk like marketers. Never use: "unlock potential", "maximize score potential", "tailored support", "custom strategies", "growth areas", "concrete score gains", "dream college within reach", "invest in your future", "empower your child".
Replace with plain, direct speech: "raise your child's score", "tutoring" (not "prep" or "support").

### Specificity Rules
- All score claims MUST include conditions: "16 sessions → 200+ points" or "100 points/month at 2 sessions/week + 20 min/day practice" — NOT just "gain 200 points".
- Score improvement claims above a 1400 starting point are not credible for 200+ point gains. Adjust claims for the score range.
- Describe the MECHANISM, not just the result: instead of "personalized/expert/data-driven", explain HOW — e.g., "The digital SAT has built-in calculator tools that can solve questions in 15 seconds instead of 75 — most students don't know they exist."

### Meta Ad Structure
Follow this structure for maximum impact:
1. Hook (1 sentence) — pattern interrupt that stops the scroll
2. Short explanation (2-3 lines max) — why this matters
3. Micro-commitment CTA — low friction next step`;

export function buildGenerationPrompt(
	brief: AdBrief,
	campaignPrompt?: string,
	personaContext?: string,
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

	if (personaContext) {
		prompt += `\n\nTARGET PERSONA: ${personaContext}`;
	}

	if (campaignPrompt) {
		prompt += `\n\nCAMPAIGN CONTEXT: "${campaignPrompt}"`;
	}

	return prompt;
}

const DIMENSION_TECHNIQUES: Record<string, string> = {
	clarity:
		"Use countdown structure (one idea per line). Cut to <10 words per sentence. First 5 words must convey the core message. Remove any word that doesn't earn its place.",
	valueProposition:
		'Add a specific number with conditions (e.g., "16 sessions → 200+ points"). Name a competitor and compare directly. Describe the mechanism (HOW it works), not just the result.',
	callToAction:
		'Build the body so the CTA feels inevitable — NOT clicking should feel like a loss. Use micro-commitment framing ("See what score is realistic" not "Learn More"). Connect the CTA directly to the offer.',
	brandVoice:
		'Use "your child" not "your student". Sound like a parent talking to another parent, not a marketer. No corporate language. Confident and specific, not aspirational and vague.',
	emotionalResonance:
		'Name the EXACT situation ("3.8 GPA but 1180 SAT" not "struggling with tests"). Use before/after framing with real score numbers. Build an emotional arc — hook fear/frustration, then resolve with a clear path.',
};

export function buildRegenerationPrompt(
	brief: AdBrief,
	previousAd: GeneratedAd,
	evaluation: Evaluation,
): string {
	const dimensionScores = evaluation.dimensions
		.map((d) => `- ${d.dimension}: ${d.score}/10 — ${d.rationale}`)
		.join("\n");

	const weakDimensions = evaluation.dimensions.filter((d) => d.score < 8);
	const techniquesSection = weakDimensions
		.map((d) => {
			const technique = DIMENSION_TECHNIQUES[d.dimension];
			return technique ? `${d.dimension} (${d.score}/10): ${technique}` : null;
		})
		.filter(Boolean)
		.join("\n\n");

	let prompt = `You previously generated the following ad copy, which needs improvement.

PREVIOUS AD:
- Primary Text: ${previousAd.primaryText}
- Headline: ${previousAd.headline}
- Description: ${previousAd.description}
- Call to Action: ${previousAd.callToAction}

EVALUATION SCORES:
${dimensionScores}

ORIGINAL BRIEF:
Audience: ${brief.audience}
Campaign Goal: ${brief.campaignGoal}
Emotional Angle: ${brief.emotionalAngle}
Hook Style: ${brief.hookStyle}
Body Pattern: ${brief.bodyPattern}
Offer: ${brief.offerType}
Brand Voice: ${brief.brandVoice.join(", ")}
Product: ${brief.product}`;

	if (techniquesSection) {
		prompt += `

IMPROVEMENT TECHNIQUES — apply these to every dimension that needs improvement:

${techniquesSection}`;
	}

	prompt += `

You MAY restructure the ad if the current structure is the bottleneck. Preserve what works, change what doesn't.

Regenerate the ad copy, improving ALL weak dimensions simultaneously. Do not sacrifice strengths in dimensions already scoring well.`;

	if (brief.proofPoints?.length) {
		prompt += `\n\nPROOF POINTS (use at least one of these specific claims in the ad):\n${brief.proofPoints.map((p) => `- ${p}`).join("\n")}`;
	}

	return prompt;
}
