# Technical Writeup: Nerdy Ad Engine

## System Overview

Nerdy Ad Engine is an autonomous ad copy generation system for Varsity Tutors that uses a self-healing LLM pipeline to produce high-quality Facebook/Instagram ad copy. The system generates ad variants from a combinatorial brief matrix (3 audiences x 2 goals x 4 emotions x 4 hooks x 3 body patterns x 4 offers = 1,152 unique briefs), evaluates each ad against a 5-dimension rubric using LLM-as-judge, and iteratively improves ads that fall below a quality threshold of 7.5/10. The system also supports LLM-powered brief generation from natural language prompts (promptToBriefs), with the matrix as fallback.

The architecture is a Bun monorepo with three packages:

- **packages/pipeline** -- Core pipeline containing the LangGraph-based generate-evaluate-iterate loop, Drizzle ORM schema (7 tables in SQLite), the evaluator with weighted scoring, the brief matrix generator, and a Playwright-based Meta Ad Library scraper for competitor analysis.
- **apps/server** -- Elysia API serving ads, evaluations, briefs, and pipeline execution endpoints.
- **apps/dashboard** -- Next.js 16 dashboard with Tailwind v4, Recharts for visualizing ad quality stats/trends/per-ad radar charts, and motion (framer-motion v12+) for shared layout animations.

## Key Design Decisions

**Evaluator-first development** (see [ADR 0002](../decisions/0002-evaluator-first.md)): The evaluator was built and calibrated before the generator, using reference ads to establish scoring baselines. This ensured the feedback loop had a reliable signal from day one.

**LangGraph StateGraph** (see [ADR 0003](../decisions/0003-langgraph-pipeline.md)): The pipeline is a compiled LangGraph `StateGraph` with six nodes (`generate -> evaluate -> decide -> publish | discard | regenerate`) and conditional edges. The `decide` node routes based on the weighted score: >= 7.5 publishes, exhausted retries discard, otherwise regenerate targeting the weakest dimension.

**SQLite + Drizzle ORM** (see [ADR 0004](../decisions/0004-bun-sqlite.md)): Using `bun:sqlite` with `drizzle-orm/bun-sqlite` provides zero-dependency, type-safe persistence. Seven tables track competitor ads, briefs, generated ads, evaluations, iteration logs, token usage, and campaigns. The campaign-based workflow supports prompt-driven ad creation with pagination for browsing large result sets.

**Structured output via Zod**: Both generator and evaluator use `withStructuredOutput` to enforce typed JSON responses from the LLM, eliminating parsing failures and ensuring every evaluation includes all 5 dimensions.

**Quality threshold & evaluator calibration** (see [ADR 0005](../decisions/0005-quality-threshold-and-evaluator-bias.md)): The initial 7.0 threshold with a lenient evaluator meant most ads passed on the first iteration, bypassing the self-healing loop. The fix was two-pronged: raise the publish threshold to 7.5, and add explicit tough-critic instructions to the evaluator prompt (penalize generic content, anchor scoring baseline at 5-6 for first drafts, set evaluator temperature to 0 for deterministic scoring). Three few-shot examples at ~8.0, ~6.0, and ~4.0 calibrate the scoring distribution.

**Single model via OpenRouter**: Gemini 2.0 Flash (`google/gemini-2.0-flash-001`) handles both generation (temperature 0.7) and evaluation (temperature 0) through OpenRouter, providing a cost-effective single-API approach.

## Iteration Methodology

The self-healing loop works as follows:

1. **Generate**: An ad is created from a brief using the generation prompt (Varsity Tutors brand voice, ad copy format with primaryText, headline, description, CTA).
2. **Evaluate**: The ad is scored by LLM-as-judge across 5 weighted dimensions: clarity (20%), value proposition (25%), call-to-action (20%), brand voice (15%), and emotional resonance (20%). Each dimension gets a 1-10 score with rationale. A weighted average produces the overall score.
3. **Decide**: If weighted score >= 7.5, publish. If retries exhausted, discard. Otherwise, iterate.
4. **Diagnose & Regenerate**: The `diagnoseWeakness` function identifies the lowest-scoring dimension (breaking ties by weight). The regeneration prompt includes the previous ad, all scores with rationale, and explicitly targets the weakest dimension while instructing the model to preserve strengths.
5. **Re-evaluate**: The regenerated ad is scored again, and the loop repeats until published or discarded.

The evaluation prompt includes three few-shot examples (a good ad scoring ~8.0, a mediocre ad scoring ~6.0, and a poor ad scoring ~4.0) to calibrate the scoring distribution. The evaluator runs at temperature 0 for deterministic scoring; the generator runs at temperature 0.7 for creative variation.

## Results

- **Pipeline output**: 353 published ads from 358 briefs across 9 campaigns, with a 98.6% pass rate. Published ads average 7.66/10 weighted score (min 7.55, max 8.4). The 5 discarded ads averaged 7.09 — below the 7.5 threshold even after exhausting 3 iterations.
- **Iteration effectiveness**: Average 1.6 iterations per brief. 158 ads (44%) published on the first iteration, 177 (50%) on the second, and 18 (5%) on the third. The self-healing loop successfully improves most ads within 2 iterations, targeting diagnosed weaknesses (most commonly emotional resonance and brand voice).
- **Test coverage**: 158 tests across 16 test files covering types, generation, evaluation, iteration, graph, scraper, database, API routes, campaigns, brief generation, and token tracking.
- **Quality gates**: All three gates pass consistently -- Biome lint (zero violations), TypeScript strict mode (zero errors across 3 workspaces), and bun test (all passing).
- **Brief matrix**: 1,152 unique brief combinations available via combinatorial generation, with LLM-powered `promptToBriefs` as the primary brief creation method for campaign-driven workflows.
- **Competitive calibration**: Evaluator calibrated against 63 scraped competitor ads from Meta Ad Library across 6 advertisers (Varsity Tutors, Kumon, Chegg, Tutor.com, Wyzant, Khan Academy). Ads were tiered by duration as a quality proxy (high: 65d avg, mid: 31d avg, low: 7d avg). Key finding: a negative correlation (-0.149) between ad duration and evaluator score reveals that the evaluator measures VT brand alignment rather than universal ad quality. VT ads scored highest (avg 5.31); long-running competitor ads scored lower (avg 4.48) despite real-world longevity. Franchise/spam ads correctly scored 1.0-1.6. Few-shot examples were updated from synthetic to real competitor ads. See [ADR 0006](../decisions/0006-calibration-with-duration-proxy.md).

## Limitations

The top three limitations (see [docs/limitations.md](limitations.md) for the full list):

1. **Self-referential evaluation**: The same model family evaluates ads it generates, which may create blind spots and convergence to local optima rather than genuinely better ads. ADR 0005 partially mitigates this with tough-critic prompting and deterministic scoring (temperature 0), but the fundamental limitation remains.
2. **No real-world calibration**: Scores are not validated against human judgments or actual ad performance metrics (CTR, conversion rates).
3. **Linear cost scaling**: Each generation and evaluation consumes API tokens with no caching or deduplication, making large batch runs expensive.
