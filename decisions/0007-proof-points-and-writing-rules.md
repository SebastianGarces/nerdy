# 0007. Add Proof Points and Explicit Writing Rules to Ad Generation Prompts

**Date**: 2026-03-11
**Status**: accepted

## Context

Few-shot examples alone weren't sufficient to make Gemini Flash produce ads with concrete numbers and punchy structure like real high-performing Varsity Tutors ads. The model defaulted to generic platitudes despite having 3 real examples in the prompt. The gap between example quality and generated output suggested the model recognized patterns in examples but could not consistently replicate them without explicit constraints.

## Decision

Three changes to the prompt engineering stack:

1. **Proof points in briefs**: Added an optional `proofPoints` field to `AdBriefSchema`. The brief generator seeds 2-3 concrete numerical claims per brief (e.g., "200+ point SAT improvement in 8 weeks", "93% of students improve within 3 sessions"). These give the generator specific numbers to weave into ad copy rather than inventing vague claims.

2. **Mandatory writing rules in generator prompt**: Added explicit constraints to the generator system prompt:
	- Require specific numbers in every ad (percentages, timeframes, counts)
	- Short sentences — max 12 words per sentence
	- Mathematical/logical structure (before/after framing, if/then patterns)
	- Banned filler phrases (e.g., "unlock your potential", "journey to success", "take the first step")

3. **Evaluator scoring penalty**: Sharpened evaluator scoring guidelines to reward concrete numbers and penalize numberless ads — value proposition dimension capped at 5 for ads without specific claims.

## What Failed First

**Few-shot examples with "Why it works" annotations.** Each of the 3 real Varsity Tutors examples was annotated with bullet points explaining what made it effective (e.g., "Uses specific number: 200+ points", "Short punchy headline under 8 words"). The model acknowledged the patterns in its reasoning but still produced generic output. Explicit rules as hard constraints were needed — the model follows instructions more reliably than it imitates examples.

## Consequences

**Positive**:
- Ads now consistently include concrete numbers and specific claims
- Shorter, punchier sentence structure matches real high-performing VT ad copy
- Evaluator rewards specificity, creating a reinforcing feedback loop
- Proof points in briefs give the generator grounded material rather than relying on hallucinated statistics

**Negative**:
- Proof points are LLM-generated, not verified real statistics. Claims like "93% of students improve by 150+ points" sound plausible but may not reflect actual Varsity Tutors data
- Banned phrase list requires maintenance as the model finds new filler patterns
- The 12-word sentence cap may be too restrictive for some ad formats (e.g., longer-form Facebook primary text)
- Value proposition cap at 5 for numberless ads is a blunt instrument — some effective ads use qualitative social proof rather than numbers
