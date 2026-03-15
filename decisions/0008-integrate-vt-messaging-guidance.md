# 0008. Integrate Official Varsity Tutors Messaging Guidance and Personas

**Date**: 2026-03-15
**Status**: accepted

## Context

We received official Varsity Tutors supplementary guidance (`docs/c4_automatic_ad_generator_supplementary.md`) containing:
- Explicit messaging do's/don'ts from VT's sales and marketing team
- 7 detailed parent personas with psychology, demographics, and pre-validated hooks
- 100+ cold audience hooks organized by segment
- Real competitive data (pricing, score improvements, methodology)
- Detailed offer positioning and sales messaging

ADR 0007 noted that proof points were LLM-generated, not verified real statistics. This guidance provides real VT data to replace those claims.

## Decision

Four integrated changes:

1. **Generator prompt: VT writing rules** — Added hard constraints from VT brand guidelines:
   - "Your child" not "your student"
   - "SAT tutoring" not "SAT prep"
   - No fake scarcity (use calendar urgency instead)
   - No corporate speak (use plain parent language)
   - All claims must include conditions (sessions, timeframe, practice commitment)
   - Describe mechanism, not just results
   - Meta ad structure: hook → pattern interrupt → micro-commitment CTA

2. **Real proof points library** — 19 verified VT claims across 6 categories (score-improvement, competitive-comparison, pricing, digital-sat, scholarship, methodology). These replace LLM-generated claims in briefs.

3. **Persona-driven brief generation** — 7 personas from VT data drive targeted ad generation:
   - athlete-family, suburban-optimizer, immigrant-navigator, cultural-investor, system-optimizer, neurodivergent-advocate, burned-returner
   - Each persona has name, description, psychology, and sample hooks
   - Persona context passed to the generator prompt as targeting guidance

4. **Evaluator anti-pattern penalties** — Hard scoring caps for VT brand violations:
   - "Your student" → brandVoice capped at 5
   - Fake scarcity → brandVoice + emotionalResonance capped at 5
   - Corporate speak → brandVoice capped at 5
   - "Online tutoring" framing → brandVoice capped at 5
   - Rewards for mechanism specificity and conditional claims

## What Failed First

Nothing was attempted first — this was a direct integration of new source material. However, the changes address limitations identified in ADR 0007 where few-shot examples alone weren't sufficient to prevent generic output.

## Consequences

**Positive**:
- Proof points are now grounded in real VT data, not hallucinated statistics
- Writing rules enforce VT brand guidelines that the model wouldn't naturally follow (e.g., "your child" vs "your student")
- Persona targeting produces more psychologically varied ads instead of generic parent-targeting
- Evaluator creates a feedback loop that penalizes exactly what VT says not to do
- Generator/evaluator alignment: both now enforce the same rules

**Negative**:
- Proof points are still curated claims from marketing materials, not independently verified statistics
- Persona assignment in the combinatorial matrix is round-robin, not intelligently matched to brief parameters
- Adding persona context increases prompt length and token usage slightly
- The 7 personas are SAT-focused — other VT products (general tutoring, college essays) may need different personas
