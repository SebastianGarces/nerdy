# Active Context: Nerdy Ad Engine

## Current Phase
Pipeline validated with real LLM API. Generating real ads end-to-end.

## Just Completed
- Real pipeline run: 47 briefs → 72 ads, avg score 7.46, 93% >= 7.0, 100% >= 6.0
- Campaign creation via promptToBriefs working end-to-end with OpenRouter/Gemini 2.0 Flash
- Memory bank and docs synced to match actual codebase state

## Quality Gates
- Biome: 0 violations (77 files)
- TypeScript: 0 errors (all 3 workspaces)
- Tests: 133 pass, 0 fail (18 test files)

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
1. Update technical-writeup Results section with real pipeline numbers
2. Run Meta Ad Library scraper for competitive intelligence (+10 bonus)
3. Verify dashboard trend charts and token_usage tracking with real data
4. Docker deployment verification
5. Future: image generation (portrait dimensions for Instagram/Facebook)

## Blockers
None
