# Active Context: Nerdy Ad Engine

## Current Phase
Pipeline mature with 353 published ads across 9 campaigns. Dashboard polished with animations.

## Just Completed
- Ad detail dialog with shared layout animations (motion/framer-motion v12+)
- CreativeCard refactored: content/wrapper split, button mode with layoutId
- Iteration timeline improved: multi-expand, final iteration badge, reversed order
- ADR 0005: quality threshold 7.5 + evaluator bias fix (tough-critic, temp 0, 3 few-shot)
- Technical writeup updated with real DB stats (353 published, 98.6% pass rate, avg 7.66)
- Progress.md and docs synced to current state
- Latency tracking feature completed (eval latencyMs column, latency-summary + latency-over-time API endpoints, dashboard analytics section)
- Migration journal fixed (was missing 0001, 0002 entries)
- 7 personas, proof points library, VT writing rules (ADRs 0007, 0008)

## Quality Gates
- Biome: 0 violations
- TypeScript: 0 errors (all 3 workspaces)
- Tests: 219 pass, 0 fail (26 test files)

## Key Architecture Notes
- Root tsconfig is base-only — typecheck runs tsc per-workspace
- Dashboard tsconfig has types: ["react", "react-dom", "node"], lib: ["ESNext", "DOM", "DOM.Iterable"]
- Dashboard needs @types/node in devDeps or Next.js tries to auto-install via yarn and fails
- Next.js auto-adds allowJs and incremental to dashboard tsconfig — don't fight it
- Biome ignores .agents, .claude, skills-lock.json
- Tab indentation enforced by biome
- bun:sqlite used instead of better-sqlite3 (native bindings incompatible with Bun)
- LangGraph StateGraph with 6 nodes and conditional edges + campaignPrompt annotation
- OpenRouter API for LLM access (Gemini 2.0 Flash)
- .env symlinked from root to apps/server/ and apps/dashboard/ (bun loads .env from cwd, --filter changes cwd)
- SERVER_PORT=4000 (3001 used by another project)
- Dashboard API_URL defaults to http://localhost:4000
- Campaign creation uses promptToBriefs (LLM) with generateBriefs (matrix) as fallback
- Campaign detail page polls every 3s while status is "generating"

## Next Steps
1. Upgrade Next.js from 15 to 16
2. Run Meta Ad Library scraper for competitive intelligence (+10 bonus)
3. Verify dashboard trend charts and token_usage tracking with real data
4. Docker deployment verification
5. Future: image generation (portrait dimensions for Instagram/Facebook)

## Blockers
None
