# 0005. Raise Quality Threshold to 7.5 and Reduce Evaluator Leniency

**Date**: 2026-03-10
**Status**: accepted

## Context

The initial pipeline used a quality threshold of 7.0. In practice, nearly all first-draft ads passed on the first iteration — the LLM-as-judge was too lenient, scoring generic copy at 7+ across all dimensions. This defeated the purpose of the self-healing loop: if everything passes immediately, the iterate-and-improve cycle never fires and ads ship without refinement.

The root cause was two-fold:
1. The threshold (7.0) was too low given the evaluator's scoring tendencies.
2. The evaluator lacked explicit instructions to be critical. Without guidance, LLMs default to generous scoring — a well-known bias where models rate their own (or similar) output favorably.

## Decision

Tackle the problem from two angles simultaneously:

### 1. Stricter evaluator prompting (reduce bias)

Added explicit scoring guidelines to the evaluation system prompt:
- **"Be a tough critic."** Most first-draft ads are mediocre. A 7+ should be reserved for genuinely strong copy you'd approve for a paid campaign without changes.
- **"Penalize generic content."** If the ad could apply to any tutoring company by swapping the brand name, cap that dimension at 6.
- **"Penalize vague value propositions."** Platitudes like "we help students succeed" score 5 or below.
- **"Penalize weak CTAs."** Generic CTAs like "Learn More" score 5 or below.
- **"Average first-draft quality is 5-6, not 7-8."** Explicitly reframe the evaluator's baseline expectation.
- **Three few-shot examples** at score ~8.0, ~6.0, and ~4.0 to anchor the scoring distribution.

Additionally, set `temperature: 0` on the evaluator LLM for deterministic, consistent scoring.

### 2. Raise the publish threshold from 7.0 to 7.5

The `QUALITY_THRESHOLD` constant in the decide node was raised to 7.5. Combined with the stricter evaluator, a 7.5 under the new regime represents genuinely strong copy — significantly better than a 7.0 under the old lenient scoring.

## Consequences

**Positive**:
- Most ads now require at least 2 iterations, with the regeneration prompt targeting the weakest dimension each time. This produces meaningfully better final copy.
- Some ads pass on the first iteration (genuinely strong briefs/generations), showing the system isn't just artificially gating everything.
- A small number reach 3 iterations, demonstrating the loop handles diminishing-returns cases.
- Very few ads get discarded after exhausting 3 iterations — the system recovers most ads through targeted improvement.
- A 7.5 score now represents real quality: specific, differentiated, on-brand copy with genuine emotional resonance. The score is trustworthy.

**Negative**:
- Higher token cost per ad due to more iterations (2-3x more LLM calls on average).
- Longer pipeline execution time per brief.
- Still fundamentally self-referential: the same model family generates and judges, so blind spots remain (see limitations.md).

## Alternatives Considered

- **Threshold only (keep lenient evaluator, raise to 8.0+)**: Rejected because inflating the threshold without fixing scoring bias just creates an arms race. The evaluator would still give 7s to mediocre copy, and we'd keep raising the bar without improving discrimination.
- **Evaluator bias fix only (keep threshold at 7.0)**: Considered, but the stricter evaluator alone might still let marginal ads through at 7.0. The threshold bump provides an additional safety margin and ensures most ads see at least one improvement cycle.
- **Separate evaluator model**: Using a different model family for evaluation would reduce self-referential bias. Rejected for now due to added complexity and cost, but worth revisiting if calibration results show persistent blind spots.
- **Human-in-the-loop scoring**: Calibrate the evaluator against human judgments. Not feasible within the project timeline but would be the gold standard for production use.
