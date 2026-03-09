# System Patterns: Nerdy Ad Engine

## Architecture Overview
Bun monorepo with three workspaces:
- `packages/pipeline` — core LangGraph ad generation + evaluation logic
- `apps/server` — Elysia HTTP API
- `apps/dashboard` — Next.js frontend

## Key Components
- **LangGraph state machine**: generate -> evaluate -> decide -> (publish | diagnose -> regenerate)
- **LLM-as-judge evaluator**: Scores ads on 5 weighted dimensions
- **Meta Ad Library scraper**: Playwright-based, ad longevity as performance proxy
- **SQLite + Drizzle**: Type-safe persistence for ads, evaluations, token usage
- **LangSmith**: Automatic tracing of all LLM calls and graph execution

## Design Decisions
See `decisions/` directory for detailed ADRs.

## Patterns in Use
- Graph-based agent orchestration (LangGraph conditional edges + cycles)
- LLM-as-judge with structured JSON output
- Targeted regeneration on weakest dimension
- Ad longevity as performance proxy (11.3% survive 60+ days)
- Performance-per-token as north star metric

## Submission Docs
- `docs/technical-writeup.md` — 1-2 page summary (update as system evolves)
- `docs/ai-tools-used.md` — all models, tools, prompts (update on every addition)
- `docs/limitations.md` — honest limitations + failed approaches (update on failures)
- `decisions/` — ADRs including failed approaches and reasoning
- See CLAUDE.md "Submission Documentation" section for update triggers
