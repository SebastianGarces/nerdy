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

## In Progress
Nothing — MVP first pass is complete

## Not Started
- [ ] End-to-end testing with real LLM API
- [ ] Run pipeline with 50+ briefs
- [ ] Evaluator calibration with real output
- [ ] Dashboard overhaul: Pomelli-style prompt-driven campaign creation
- [ ] User prompt/guidance input for pipeline (not just count)
- [ ] Image generation (portrait 1080x1350 for IG/FB) — future
- [ ] Performance optimization

## Known Issues
- Module mocking in bun:test can leak between test files (fixed with spread import pattern)
- better-sqlite3 not compatible with Bun (switched to bun:sqlite)
- Dashboard needs @types/node or Next.js tries to yarn-install it (breaks on workspace: protocol)
- Next.js auto-modifies tsconfig (adds allowJs, incremental) — let it
- .env must be symlinked to apps/server/ and apps/dashboard/ (bun --filter changes cwd)

## Test Count
114 tests across 16 files (0 failures)
