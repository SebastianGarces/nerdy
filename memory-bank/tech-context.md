# Tech Context: Nerdy Ad Engine

## Stack
- Language: Bun + TypeScript (strict mode)
- Package Manager: bun (workspace monorepo)
- Framework (backend): Elysia (Bun-native)
- Framework (frontend): Next.js + Tailwind + shadcn/ui
- Agent Framework: LangGraph.js
- Tracing: LangSmith
- ORM: Drizzle ORM + bun:sqlite (switched from better-sqlite3 — native bindings incompatible with Bun)
- Validation: Zod
- Linter: Biome (`bun run biome check .`)
- Type Checker: TypeScript (`bunx tsc --noEmit`)
- Test Runner: Bun test (`bun test`)

## External Services
- **OpenRouter** — LLM gateway (Gemini models for generation + evaluation)
- **LangSmith** — Tracing and observability (free tier)
- **Meta Ad Library** — Public competitor ad data (scraped via Playwright)
- **SQLite** — Local file database

## Deployment
- Docker + docker-compose for local
- Railway anticipated for production

## Key Dependencies
| Package | Purpose |
|---------|---------|
| `@langchain/langgraph` | Graph-based agent orchestration |
| `@langchain/openai` | OpenAI-compatible SDK (works with OpenRouter) |
| `langsmith` | Tracing |
| `drizzle-orm` + `drizzle-kit` | ORM + migrations |
| `bun:sqlite` | SQLite driver (built-in) |
| `playwright` | Web scraping |
| `elysia` | Backend HTTP server |
| `zod` | Schema validation |
| `nanoid` | ID generation |
| `recharts` | Dashboard charts |
| `@tanstack/react-query` | Data fetching |

## Constraints
- Solo project — keep complexity manageable
- Gemini via OpenRouter may have rate limits during batch generation
- No real ad performance data (CTR, conversions) — use heuristics
- Meta Ad Library scraping subject to anti-bot measures
