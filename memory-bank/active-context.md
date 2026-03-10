# Active Context: Nerdy Ad Engine

## Current Phase
MVP First Pass complete. All 7 phases implemented and merged to main.

## Just Completed
- Phase 0: Types + Zod schemas + Drizzle DB schema (6 tables)
- Phase 1: LLM-as-judge evaluator (5 dimensions, weighted scoring)
- Phase 2: Ad generator with brief matrix (1152 combos) + regeneration
- Phase 3: LangGraph pipeline (generate → evaluate → decide → publish/discard/regenerate loop)
- Phase 4: Elysia API routes (ads, briefs, evaluations, pipeline)
- Phase 5: Next.js dashboard (stats, ad list, ad detail with radar chart, trends)
- Phase 6: Meta Ad Library scraper (Playwright)
- Phase 7: Documentation (technical writeup, AI tools, limitations, 3 ADRs)

## Quality Gates
- Biome: 0 violations (68 files)
- TypeScript: 0 errors (all 3 workspaces)
- Tests: 114 pass, 0 fail (16 test files)

## Key Architecture Notes
- Root tsconfig is base-only — typecheck runs tsc per-workspace
- Dashboard tsconfig has types: ["react", "react-dom", "node"] — no bun-types (conflicts with React types)
- Dashboard needs @types/node in devDeps or Next.js tries to auto-install via yarn and fails
- Next.js auto-adds allowJs and incremental to dashboard tsconfig — don't fight it
- Biome ignores .agents, .claude, skills-lock.json
- Tab indentation enforced by biome
- bun:sqlite used instead of better-sqlite3 (native bindings incompatible with Bun)
- LangGraph StateGraph with 6 nodes and conditional edges
- OpenRouter API for LLM access (Gemini 2.0 Flash)
- .env symlinked from root to apps/server/ and apps/dashboard/ (bun loads .env from cwd, --filter changes cwd)
- SERVER_PORT=4000 (3001 used by another project)

## Next Steps
1. Overhaul dashboard: Pomelli-style prompt-driven campaign creation UI
2. Add user prompt/guidance input to pipeline (not just count-based generation)
3. Run pipeline with real API key to generate 50+ ads
4. Future: image generation (portrait dimensions for Instagram/Facebook)

## Blockers
None
