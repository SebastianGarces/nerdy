# 0001: Project Bootstrap

**Date:** 2026-03-09
**Status:** accepted

## Context
Setting up the development workflow for Nerdy Ad Engine — an autonomous ad copy generation system for Varsity Tutors. Need to establish tooling, workflow patterns, and conventions for a solo project.

## Decision
Adopted an agentic development workflow with:
- **Orchestrator pattern**: Main agent decomposes and delegates; spawned agents implement in isolated worktrees
- **Stack**: Bun + TypeScript, Biome (lint), tsc (typecheck), bun test (testing)
- **Quality gates**: `bun run biome check .` + `bunx tsc --noEmit` + `bun test` must pass before merge
- **Memory bank**: Six-file cross-session knowledge persistence
- **Decision log**: Lightweight ADRs in decisions/
- **TDD**: Mandatory — red-green-refactor cycle
- **Conventional commits**: type(scope): description

## Consequences
- Consistent workflow across all development sessions
- Knowledge persists across sessions via memory bank
- Architectural decisions are traceable via decision log
- Agents work in isolation, reducing conflicts
- Quality gates enforce standards automatically
- TDD ensures test coverage from the start

## Alternatives Considered
- Manual workflow without orchestration — rejected for inconsistency across sessions
- Heavier ADR format — rejected in favor of lightweight decision log
- ESLint + Prettier — rejected in favor of Biome (single tool, faster)
