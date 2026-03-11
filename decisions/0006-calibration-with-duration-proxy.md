# 0006. Calibrate Evaluator Using Ad Duration as Quality Proxy

**Date**: 2026-03-10
**Status**: accepted

## Context

The LLM-as-judge evaluator needed calibration against real-world data. Without human labels or ad performance metrics (CTR, conversions), we needed an objective proxy for ad quality to test whether the evaluator's scores correlate with real-world effectiveness.

We scraped 63 competitor ads from the Meta Ad Library across 6 advertisers in the online tutoring space: Varsity Tutors, Kumon, Chegg, Tutor.com, Wyzant, and Khan Academy. The hypothesis was that longer-running ads are higher quality — advertisers keep effective ads running and kill underperformers.

## Decision

Use ad duration (days since first observed) as a quality proxy, tiering ads into three groups by thirds:

- **High tier**: top third by duration (avg 65 days)
- **Mid tier**: middle third (avg 31 days)
- **Low tier**: bottom third (avg 7 days)

Run all 63 ads through the evaluator and measure correlation between duration tier and weighted score. Use findings to update few-shot examples from synthetic to real competitor ads.

## Findings

The calibration revealed a **negative correlation (-0.149)** between ad duration and evaluator score, contradicting the hypothesis. Root causes:

1. **Brand voice bias**: The evaluator is tuned for Varsity Tutors brand voice. VT's own ads (which happened to be recent/short-running, landing in the low tier) scored highest (avg 5.31). Long-running competitor ads from Kumon and Tutor.com averaged 4.48 — not because they are bad ads, but because they don't match VT's tone.
2. **Franchise/recruitment noise**: Several long-running ads were franchise recruitment or branding ads (scored 1.0-1.6). These are legitimately long-running but are not tutoring ads, adding noise to the duration signal.
3. **Duration ≠ quality**: Ad longevity reflects many factors beyond copy quality — budget, campaign objectives, audience size, seasonal relevance. It is a weak proxy at best.

Overall: 57% of competitor ads passed the 7.5 threshold. The evaluator reliably distinguishes good tutoring ads from bad ones (franchise/spam scored very low) but its scoring is dominated by brand alignment rather than universal quality.

## Consequences

**Positive**:
- Few-shot examples updated from synthetic to real competitor ads, improving scoring anchors with grounded examples.
- Calibration report documents the evaluator's behavior and biases, providing useful self-knowledge.
- Brand bias is now acknowledged and documented rather than being an unknown blind spot.
- Confirms the evaluator reliably flags non-tutoring content (franchise, recruitment, spam).

**Negative**:
- Duration as a quality proxy is weak for our evaluator — the -0.149 correlation means it cannot validate scoring accuracy.
- Small sample size (63 ads, 6 advertisers) limits statistical significance of all findings.
- Few-shot examples, while grounded in real ads, still reflect VT brand bias in their selection.
- No alternative objective quality signal identified — human labeling remains the gold standard but is out of scope.

## Alternatives Considered

- **Human labeling**: Have domain experts rate the 63 ads and compare against evaluator scores. Would be the gold standard but was not feasible within the project timeline.
- **Engagement metrics from ad platforms**: Use CTR/conversion data as the quality signal. Not available — Meta Ad Library does not expose performance metrics.
- **A/B test evaluator variants**: Run multiple evaluator prompt variants against the same ads and compare score distributions. Considered for future work but would not solve the lack of ground truth.
- **Remove brand bias from evaluator**: Make the evaluator brand-neutral to score universal ad quality. Rejected because brand alignment is a feature, not a bug — the system's purpose is to generate on-brand VT ads, so the evaluator should prefer VT's voice.
