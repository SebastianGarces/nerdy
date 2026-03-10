# Nerdy Ad Engine

Autonomous ad copy generation system for Varsity Tutors. Uses a self-healing LLM pipeline (LangGraph) to generate, evaluate, and iteratively improve Facebook/Instagram ad copy. Ads are scored by an LLM-as-judge evaluator across 5 dimensions and regenerated until they meet a quality threshold of 7.5/10.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- OpenRouter API key (for LLM access)

## Quick Start

```bash
bun install
cp .env.example .env   # Add your OPENROUTER_API_KEY
```

## Running

```bash
# Start the API server (port 4000)
bun dev:server

# Start the dashboard (port 3000)
bun dev:dashboard
```

Or with Docker:

```bash
docker-compose up
```

## Testing

```bash
bun test
```

## Quality Checks

```bash
bun run check       # Biome lint
bun run typecheck   # TypeScript strict mode
```

## Project Structure

```
packages/pipeline/   # Core pipeline: LangGraph graph, generator, evaluator, scraper
apps/server/         # Elysia API server
apps/dashboard/      # Next.js 15 dashboard with Recharts visualizations
docs/                # Technical writeup, AI tools used, limitations
decisions/           # Architecture Decision Records
```

## Documentation

- [Technical Writeup](docs/technical-writeup.md)
- [AI Tools Used](docs/ai-tools-used.md)
- [Limitations](docs/limitations.md)
