# 0002. Evaluator-First Development

**Date**: 2026-03-09
**Status**: accepted

## Context

The Nerdy Ad Engine needs both a generator (to create ad copy) and an evaluator (to score ad quality). The standard approach would be to build the generator first, then add evaluation. However, without a reliable evaluator, there is no way to know if generated ads are any good -- development becomes guess-and-check.

## Decision

Build the evaluator before the generator. Calibrate scoring using hand-crafted reference ads (a known-good ad and a known-poor ad) embedded as few-shot examples in the evaluation prompt. This establishes scoring baselines before any generation code exists.

The evaluator uses 5 weighted dimensions:
- Clarity (20%)
- Value Proposition (25%)
- Call to Action (20%)
- Brand Voice (15%)
- Emotional Resonance (20%)

## Consequences

**Positive**:
- Scoring ranges are calibrated before generation begins, so the first generated ads have meaningful quality signals
- The generator is testable from day one -- every generated ad immediately gets a structured evaluation
- The quality threshold (7.0) has empirical grounding from reference ad scores
- TDD is natural: write test with expected score range, then implement generator to hit it

**Negative**:
- Evaluator development required creating reference ads manually, which is time-consuming
- The evaluator's quality is limited by the prompt engineering done before seeing real generated output
- Few-shot examples may anchor scoring too tightly around the reference ads' styles

## Alternatives Considered

- **Generator-first**: Build generation, then add evaluation. Rejected because there would be no quality signal during generator development -- every ad would need manual review.
- **Simultaneous development**: Build both in parallel. Rejected because the evaluator needs to be stable before it can provide useful feedback to the generator iteration loop.
- **Human evaluation only**: Score ads manually during development. Rejected because it does not scale and cannot be integrated into the automated pipeline loop.
