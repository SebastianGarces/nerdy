# Progress: Nerdy Ad Engine

## Completed
- [x] Pre-search / research document (pre-search.md)
- [x] Project bootstrapping (.claude/, skills, hooks, memory bank, decisions)
- [x] Bun monorepo workspace setup (package.json, tsconfig, biome.json)
- [x] packages/pipeline scaffold (Drizzle config, stub modules)
- [x] apps/server scaffold (Elysia + /health + CORS + Dockerfile)
- [x] apps/dashboard scaffold (Next.js 15 + Tailwind v4 + shadcn/ui config)
- [x] Docker setup (docker-compose.yml + Dockerfiles)
- [x] Types + Zod schemas (AdBrief, GeneratedAd, Evaluation, etc.)
- [x] Drizzle + SQLite schema (6 tables with FKs)
- [x] LLM-as-judge evaluator (5 dimensions, weighted scoring, calibration)
- [x] Ad copy generator (brief matrix 1152 combos, regeneration support)
- [x] LangGraph pipeline (StateGraph, 6 nodes, conditional edges)
- [x] Iterate module (diagnoseWeakness, shouldRetry)
- [x] Meta Ad Library scraper (Playwright)
- [x] Elysia API routes (ads, briefs, evaluations, pipeline)
- [x] Next.js dashboard (stats, ad list, detail with radar chart, trends)
- [x] Documentation (technical writeup, AI tools, limitations, 3 ADRs)
- [x] Dashboard overhaul: Pomelli-style prompt-driven campaign creation
- [x] User prompt/guidance input for pipeline (not just count)
- [x] Campaigns table (7th table) + campaignId FK on adBriefs
- [x] promptToBriefs: LLM-powered brief generation from natural language
- [x] Campaign API routes (CRUD + generate more)
- [x] Ads table pagination (limit/offset)
- [x] Ad count options increased to [5, 10, 25, 50]

- [x] End-to-end pipeline run with real LLM API (72 ads generated, avg score 7.46, 93% >= 7.0)
- [x] Run pipeline with 50+ briefs (47 briefs from promptToBriefs, 72 ads after iteration cycles)
- [x] ADR 0005: Quality threshold 7.5 + evaluator bias fix (tough-critic, temp 0, 3 few-shot)
- [x] Ad detail dialog with shared layout animations (motion)
- [x] Token usage tracking in generate/evaluate nodes
- [x] Multiple pipeline runs (353 published ads from 358 briefs, 9 campaigns, 98.6% pass rate)

## In Progress
Nothing

## Not Started
- [ ] Evaluator calibration against scraped competitor ads
- [ ] Run Meta Ad Library scraper for competitive intelligence (+10 bonus)
- [ ] Upgrade Next.js from 15 to 16
- [x] Update technical-writeup Results section with real pipeline numbers
- [ ] Verify dashboard trend charts with real data
- [ ] Verify token_usage tracking (+2 bonus for performance-per-token)
- [ ] Docker deployment verification
- [ ] Image generation (portrait 1080x1350 for IG/FB) — future
- [ ] Performance optimization

## Known Issues
- Module mocking in bun:test can leak between test files (fixed with spread import pattern)
- better-sqlite3 not compatible with Bun (switched to bun:sqlite)
- Dashboard needs @types/node or Next.js tries to yarn-install it (breaks on workspace: protocol)
- Next.js auto-modifies tsconfig (adds allowJs, incremental) — let it
- .env must be symlinked to apps/server/ and apps/dashboard/ (bun --filter changes cwd)

## Test Count
158 tests across 16 files (0 failures)
