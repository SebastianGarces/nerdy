# Product Context: Nerdy Ad Engine

## Problem
Creating high-quality ad copy at scale is expensive and slow. Manual copywriting can't iterate fast enough to optimize across audiences, emotional angles, and funnel stages. There's no systematic way to evaluate ad quality before spending ad budget.

## Solution
An autonomous pipeline that generates ad copy from structured briefs, evaluates quality using LLM-as-judge across 5 dimensions, and iteratively improves weak areas. Uses competitive intelligence from Meta Ad Library (ad longevity as performance proxy) for calibration.

## Target Users
- Varsity Tutors marketing team (primary)
- Solo project submission for Gauntlet evaluation

## User Experience
- **Campaign creation**: Pomelli-style prompt-driven UI — user describes a campaign in natural language, system generates multiple ad creatives (text now, images later)
- **Dashboard**: Browse campaigns, view per-ad scores (radar chart), track quality trends, see cost/ROI metrics
- **Pipeline**: API-triggered generation with user guidance (audience, tone, offer, or freeform prompt)
- **Scraper**: Manual CLI trigger to scrape competitor ads from Meta Ad Library

## UX Inspiration
- Google Pomelli: prompt → campaign → creatives gallery with portrait cards
- Key UX patterns: freeform prompt input, recent campaigns grid, campaign detail with creative cards, "Add Creative" to generate more
