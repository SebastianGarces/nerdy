# Technical Writeup: Nerdy Ad Engine

## System Overview

Nerdy Ad Engine is an autonomous ad copy generation system for Varsity Tutors that uses a self-healing LLM pipeline to produce high-quality Facebook/Instagram ad copy. The system generates ad variants from a combinatorial brief matrix (3 audiences x 2 goals x 4 emotions x 4 hooks x 3 body patterns x 4 offers = 1,152 unique briefs), evaluates each ad against a 5-dimension rubric using LLM-as-judge, and iteratively improves ads that fall below a quality threshold of 7.5/10. The system also supports LLM-powered brief generation from natural language prompts (promptToBriefs), with the matrix as fallback.

The architecture is a Bun monorepo with three packages:

- **packages/pipeline** -- Core pipeline containing the LangGraph-based generate-evaluate-iterate loop, Drizzle ORM schema (7 tables in SQLite), the evaluator with weighted scoring, the brief matrix generator, and a Playwright-based Meta Ad Library scraper for competitor analysis.
- **apps/server** -- Elysia API serving ads, evaluations, briefs, and pipeline execution endpoints.
- **apps/dashboard** -- Next.js 15 dashboard with Tailwind v4 and Recharts for visualizing ad quality stats, trends, and per-ad radar charts.

## Key Design Decisions

**Evaluator-first development** (see [ADR 0002](../decisions/0002-evaluator-first.md)): The evaluator was built and calibrated before the generator, using reference ads to establish scoring baselines. This ensured the feedback loop had a reliable signal from day one.

**LangGraph StateGraph** (see [ADR 0003](../decisions/0003-langgraph-pipeline.md)): The pipeline is a compiled LangGraph `StateGraph` with six nodes (`generate -> evaluate -> decide -> publish | discard | regenerate`) and conditional edges. The `decide` node routes based on the weighted score: >= 7.5 publishes, exhausted retries discard, otherwise regenerate targeting the weakest dimension.

**SQLite + Drizzle ORM** (see [ADR 0004](../decisions/0004-bun-sqlite.md)): Using `bun:sqlite` with `drizzle-orm/bun-sqlite` provides zero-dependency, type-safe persistence. Seven tables track competitor ads, briefs, generated ads, evaluations, iteration logs, token usage, and campaigns. The campaign-based workflow supports prompt-driven ad creation with pagination for browsing large result sets.

**Structured output via Zod**: Both generator and evaluator use `withStructuredOutput` to enforce typed JSON responses from the LLM, eliminating parsing failures and ensuring every evaluation includes all 5 dimensions.

**Single model via OpenRouter**: Gemini 2.0 Flash (`google/gemini-2.0-flash-001`) handles both generation and evaluation through OpenRouter, providing a cost-effective single-API approach.

## Iteration Methodology

The self-healing loop works as follows:

1. **Generate**: An ad is created from a brief using the generation prompt (Varsity Tutors brand voice, ad copy format with primaryText, headline, description, CTA).
2. **Evaluate**: The ad is scored by LLM-as-judge across 5 weighted dimensions: clarity (20%), value proposition (25%), call-to-action (20%), brand voice (15%), and emotional resonance (20%). Each dimension gets a 1-10 score with rationale. A weighted average produces the overall score.
3. **Decide**: If weighted score >= 7.5, publish. If retries exhausted, discard. Otherwise, iterate.
4. **Diagnose & Regenerate**: The `diagnoseWeakness` function identifies the lowest-scoring dimension (breaking ties by weight). The regeneration prompt includes the previous ad, all scores with rationale, and explicitly targets the weakest dimension while instructing the model to preserve strengths.
5. **Re-evaluate**: The regenerated ad is scored again, and the loop repeats until published or discarded.

The evaluation prompt includes two few-shot examples (a good ad scoring ~8.0 and a poor ad scoring ~4.0) to calibrate scoring consistency.

## Results

- **Pipeline output**: 72 ads generated from 47 LLM-created briefs, achieving an average quality score of 7.46/10. 93% of ads scored >= 7.0, and 100% scored >= 6.0, demonstrating consistent quality above the minimum threshold.
- **Iteration effectiveness**: The self-healing loop improved ads through up to 3 iterations per brief, with the regeneration prompt successfully targeting diagnosed weaknesses (most commonly emotional resonance and brand voice).
- **Test coverage**: 152 tests across 20 test files covering types, generation, evaluation, iteration, graph, scraper, database, API routes, campaigns, brief generation, and token tracking.
- **Quality gates**: All three gates pass consistently -- Biome lint (zero violations), TypeScript strict mode (zero errors across 3 workspaces), and bun test (all passing).
- **Brief matrix**: 1,152 unique brief combinations available via combinatorial generation, with LLM-powered `promptToBriefs` as the primary brief creation method for campaign-driven workflows.
- **Competitive calibration**: Evaluator calibrated against 35 scraped competitor ads from Meta Ad Library (Varsity Tutors, Wyzant, Tutor.com, Khan Academy, Chegg, Kumon). Varsity Tutors ads scored in the 7-9 range; shorter generic competitor ads scored 4-6, validating the evaluator's discrimination ability.

## Limitations

The top three limitations (see [docs/limitations.md](limitations.md) for the full list):

1. **Self-referential evaluation**: The same model family evaluates ads it generates, which may create blind spots and convergence to local optima rather than genuinely better ads.
2. **No real-world calibration**: Scores are not validated against human judgments or actual ad performance metrics (CTR, conversion rates).
3. **Linear cost scaling**: Each generation and evaluation consumes API tokens with no caching or deduplication, making large batch runs expensive.
