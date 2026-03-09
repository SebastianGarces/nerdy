# Product Context: Nerdy Ad Engine

## Problem
Creating high-quality ad copy at scale is expensive and slow. Manual copywriting can't iterate fast enough to optimize across audiences, emotional angles, and funnel stages. There's no systematic way to evaluate ad quality before spending ad budget.

## Solution
An autonomous pipeline that generates ad copy from structured briefs, evaluates quality using LLM-as-judge across 5 dimensions, and iteratively improves weak areas. Uses competitive intelligence from Meta Ad Library (ad longevity as performance proxy) for calibration.

## Target Users
- Varsity Tutors marketing team (primary)
- Solo project submission for Gauntlet evaluation

## User Experience
- **Pipeline**: CLI or API trigger to generate ads from briefs in batches
- **Dashboard**: Browse generated ads, view per-ad scores (radar chart), track quality trends over time, see cost/ROI metrics
- **Scraper**: Manual CLI trigger to scrape competitor ads from Meta Ad Library
