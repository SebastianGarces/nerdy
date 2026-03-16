# Nerdy Ad Engine

Autonomous ad copy generation system for Varsity Tutors (Nerdy). An LLM pipeline generates Facebook/Instagram ad copy, evaluates each ad with LLM-as-judge scoring across 5 dimensions, and iteratively improves underperforming ads via a self-healing feedback loop until they meet a quality threshold of 7.5/10.

## Key Features

- **Self-healing pipeline**: generate, evaluate, diagnose, regenerate (up to 3 iterations per ad)
- **5-dimension evaluation**: clarity, value proposition, CTA, brand voice, emotional resonance (weighted scoring)
- **Campaign-driven workflow**: natural language prompts produce targeted ad briefs with audience personas
- **Competitive intelligence**: Meta Ad Library scraping with evaluator calibration against 63 real competitor ads
- **Performance-per-token tracking**: latency, cost, and token usage analytics with p50/p95 breakdowns
- **Dashboard**: ad gallery, quality trend charts, per-ad radar charts, and analytics views

## Architecture

Bun monorepo with three packages:

- **packages/pipeline** -- LangGraph StateGraph (6 nodes), Gemini 2.0 Flash via OpenRouter, Drizzle ORM with SQLite
- **apps/server** -- Elysia API on port 4000, serving ads, evaluations, campaigns, and analytics
- **apps/dashboard** -- Next.js 15, Tailwind v4, Recharts, motion (framer-motion v12+)

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- OpenRouter API key (for LLM access)

## Quick Start

```bash
bun install
cp .env.example .env   # Add your OPENROUTER_API_KEY
bun dev:server          # Start the API server (port 4000)
bun dev:dashboard       # Start the dashboard (port 3000)
```

## Testing

```bash
bun test                # 219 tests across 26 test files
```

## Quality Checks

```bash
bun run check           # Biome lint + format
bun run typecheck       # TypeScript strict mode
```

## Project Structure

```
packages/pipeline/       # Core pipeline: LangGraph graph, generator, evaluator, scraper
  src/db/                #   Drizzle ORM schema (7 tables, SQLite)
  src/generate/          #   Brief generation, personas, proof points, ad copy generation
  src/evaluate/          #   LLM-as-judge evaluator with calibration
  src/graph/             #   StateGraph nodes, runner, state management
apps/server/             # Elysia API server
  src/routes/            #   REST endpoints: ads, campaigns, evaluations, analytics
  drizzle/               #   Database migrations
apps/dashboard/          # Next.js 15 dashboard
  src/app/               #   Pages: home, ads gallery, campaigns, campaign detail
  src/components/        #   UI components: creative cards, charts, dialogs
docs/                    # Technical writeup, AI tools used, limitations
decisions/               # Architecture Decision Records (ADRs)
```

## Results

- **353 approved ads** from 358 briefs across 9 campaigns (98.6% pass rate)
- **Avg score 7.66/10** (min 7.55, max 8.4) for approved ads
- **1.6 avg iterations** per brief; 44% pass on first try, 50% on second, 5% on third
- **219 tests** across 26 test files, all passing with zero lint/type errors

## Documentation

- [Technical Writeup](docs/technical-writeup.md) -- System architecture and design decisions
- [AI Tools Used](docs/ai-tools-used.md) -- Models, prompts, and development tools
- [Limitations](docs/limitations.md) -- Honest assessment of constraints and failed approaches
- [Decision Records](decisions/) -- ADRs for significant architectural choices
