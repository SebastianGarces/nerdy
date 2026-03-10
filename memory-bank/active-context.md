# Active Context: Nerdy Ad Engine

## Current Phase
Pomelli-style campaign creation feature complete. Dashboard overhauled.

## Just Completed
- Campaign schema: `campaigns` table (7 tables total), `campaignId` FK on `adBriefs`
- Prompt-to-briefs: LLM-powered brief generation from natural language + campaignPrompt threading through graph
- Campaign API: CRUD routes (POST create, GET list, GET detail, POST generate more)
- Dashboard overhaul: PromptInput, CampaignCard, CreativeCard (4:5 portrait), campaign detail page with creative gallery

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
1. Run pipeline with real API key to generate 50+ ads
2. Integrate promptToBriefs into campaign API routes (currently uses matrix fallback)
3. Future: image generation (portrait dimensions for Instagram/Facebook)

## Blockers
None
