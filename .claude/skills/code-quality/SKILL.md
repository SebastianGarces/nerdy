---
name: code-quality
description: Code quality standards for Nerdy Ad Engine. Use when writing code, reviewing code, running quality checks, or when asked about linting, type checking, testing conventions, or code style.
---

# Code Quality Standards

## Quality Gate Commands

```bash
bun run biome check .    # Lint check
bunx tsc --noEmit        # Type check
bun test                 # Run tests
```

All three must pass before committing, creating PRs, or merging.

## Linter/Formatter

Using **Biome** for linting and formatting. Config in `biome.json` at project root.
- Fast, single-tool replacement for ESLint + Prettier
- Bun-compatible
- Zero config needed for TypeScript

## Type Checking

TypeScript strict mode via `tsconfig.json`:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- Path aliases configured per workspace package

## Testing

Bun's built-in test runner (`bun test`):
- Jest-compatible API (`describe`, `it`, `expect`)
- Native TypeScript support (no compilation step)
- Test files: `*.test.ts` colocated with source or in `tests/` directories

## Monorepo Structure

```
nerdy/
├── packages/
│   └── pipeline/          # Core ad generation + evaluation
│       ├── src/
│       │   ├── generate/  # Ad copy generation from briefs
│       │   ├── evaluate/  # 5-dimension scoring, LLM-as-judge
│       │   ├── iterate/   # Feedback loop, improvement strategies
│       │   ├── scrape/    # Meta Ad Library scraper
│       │   ├── db/        # Drizzle schema, migrations, queries
│       │   └── types/     # Shared TypeScript types
│       └── tests/
├── apps/
│   ├── server/            # Elysia API server
│   │   └── src/routes/
│   └── dashboard/         # Next.js frontend
│       └── src/
│           ├── app/
│           └── components/
├── biome.json
├── tsconfig.json
└── package.json           # Workspace root
```

## Quality Checklist

Before considering code complete:
1. Lint check passes -- zero violations
2. Type check passes -- zero errors
3. All tests pass
4. New code has tests
5. No secrets or credentials in code
6. Zod schemas validate all external inputs (API responses, user input)
