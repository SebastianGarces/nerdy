# Known Limitations

## Evaluation Accuracy

The evaluator uses a single LLM (Gemini 2.0 Flash) as judge, which introduces several reliability concerns:

- **Score consistency**: The same ad may receive slightly different scores across runs due to LLM nondeterminism. The confidence score (0-1) is self-reported and not independently validated.
- **Calibration anchoring**: Two few-shot examples anchor scoring at ~4.0 (poor) and ~8.0 (good), but the model may not reliably distinguish between a 6.5 and a 7.5 -- the range that matters most for the 7.0 publish threshold.
- **No human baseline**: Scores have not been compared against human evaluator ratings. An 8/10 from the LLM may not correspond to what a human ad reviewer would consider an 8/10.
- **Dimension independence**: The 5 dimensions are scored independently, but in practice they are correlated (e.g., strong brand voice often improves emotional resonance). The model may not account for these interactions.

## Feedback Loop

- **Self-referential improvement**: The generator and evaluator use the same model family. The evaluator may systematically prefer the generator's style, creating a feedback loop that converges to a local optimum rather than genuinely better ads.
- **Dimension whack-a-mole**: Improving the weakest dimension sometimes degrades others. The regeneration prompt instructs "do not sacrifice strengths," but this is a soft constraint the model does not always respect.
- **Diminishing returns**: After 2-3 iterations, score improvements become marginal. The system caps iterations via `maxIterations` but does not detect plateaus.
- **No A/B signal**: The loop optimizes for the evaluator's preferences, not real-world ad performance. A high-scoring ad by LLM standards may not convert better.

## Scale & Cost

- **Linear token cost**: Each ad requires at least 2 LLM calls (generate + evaluate), and each retry adds 2 more. For 1,152 briefs with an average of 2 iterations, that is ~4,600 LLM calls.
- **No caching**: Identical briefs always trigger new generation. There is no semantic deduplication or result caching.
- **Rate limits**: OpenRouter rate limits can throttle batch runs. The pipeline runner supports configurable concurrency but does not implement adaptive backoff.
- **No streaming**: All LLM calls are request-response. Streaming could improve perceived latency for the dashboard but is not implemented.

## Data & Calibration

- **No real-world performance data**: The system has no connection to actual ad platform metrics (CTR, CPC, conversion rates). Quality scores are purely LLM-derived.
- **Scraper fragility**: The Meta Ad Library scraper uses Playwright with CSS selectors that are tied to the current DOM structure. Facebook UI changes will break the scraper without warning.
- **Competitor data staleness**: Scraped competitor ads are point-in-time snapshots with no automated refresh schedule.
- **Brand voice rigidity**: The Varsity Tutors brand voice is hardcoded in prompts. Adapting to a different brand requires changing multiple prompt files.

## Failed Approaches

### better-sqlite3 Native Bindings

**What we tried**: Initially used `better-sqlite3` as the SQLite driver with Drizzle ORM, which is the most common Node.js SQLite adapter.

**What happened**: `better-sqlite3` relies on native C++ bindings compiled via `node-gyp`. Bun's native module compatibility does not support these bindings, causing runtime crashes on import.

**Resolution**: Switched to `bun:sqlite`, Bun's built-in SQLite driver, with the `drizzle-orm/bun-sqlite` adapter. This eliminated all native dependencies and improved performance. See [ADR 0004](../decisions/0004-bun-sqlite.md).

### Module Mock Leaking Between Tests

**What we tried**: Used `mock.module()` to mock LLM dependencies in test files. Multiple test files mocking the same module caused mock state to leak between test suites.

**What happened**: Tests passed individually but failed when run together. Mock implementations from one test file would persist into subsequent test files due to Bun's test runner module caching behavior.

**Resolution**: Adopted dependency injection patterns where possible (passing LLM instances as parameters rather than importing globally) and ensured mock cleanup in `afterEach`/`afterAll` hooks. Test files that still require module-level mocks are isolated through careful import ordering.
