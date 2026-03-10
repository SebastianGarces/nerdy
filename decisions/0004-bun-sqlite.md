# 0004. bun:sqlite Instead of better-sqlite3

**Date**: 2026-03-09
**Status**: accepted

## Context

The pipeline needs a lightweight, embedded database for persisting ads, evaluations, briefs, and iteration logs. SQLite is the natural choice for a single-process application that does not need a separate database server. The standard Node.js SQLite adapter is `better-sqlite3`, which provides synchronous bindings via native C++ addons compiled with `node-gyp`.

However, the project uses Bun as its runtime. Bun's native module compatibility layer does not fully support `better-sqlite3`'s compiled bindings, causing import-time crashes.

## Decision

Use `bun:sqlite`, Bun's built-in SQLite driver, paired with the `drizzle-orm/bun-sqlite` adapter for type-safe schema definition and queries. The 6-table schema (competitor_ads, ad_briefs, generated_ads, evaluations, iteration_logs, token_usage) is defined using Drizzle's `sqliteTable` API.

## Consequences

**Positive**:
- Zero native dependencies -- no `node-gyp`, no compilation step, no platform-specific binaries
- Faster than `better-sqlite3` in Bun's benchmarks due to direct integration with Bun's native SQLite implementation
- Drizzle ORM provides full type safety -- schema types propagate to queries and inserts
- In-memory databases (`:memory:`) work seamlessly for testing

**Negative**:
- Tied to the Bun runtime -- the application cannot run on Node.js without switching the SQLite driver
- `bun:sqlite` API surface is smaller than `better-sqlite3` (fewer configuration options)
- Drizzle's `bun-sqlite` adapter is less battle-tested than the `better-sqlite3` adapter

## Alternatives Considered

- **better-sqlite3**: The most popular Node.js SQLite adapter. Rejected because its native bindings are incompatible with Bun's runtime, causing crashes on import.
- **sql.js (wasm-based SQLite)**: Runs everywhere but is significantly slower than native SQLite and adds ~2MB to the bundle. Rejected for performance reasons.
- **PostgreSQL / MySQL**: Full database servers add operational complexity (connection management, migrations, Docker setup) that is unnecessary for a single-process pipeline application. Rejected for simplicity.
- **JSON file storage**: Writing results to JSON files. Rejected because it lacks query capabilities, indexing, and referential integrity needed for evaluation trend analysis.
