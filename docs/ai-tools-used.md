# AI Tools & Prompts Used

## Development Tools

| Tool | Purpose |
|------|---------|
| Claude Code (claude-opus-4-6) | Architecture design, implementation orchestration, code generation, test writing, debugging |
| Biome | Linting and formatting (tab indentation, import organization) |
| TypeScript (strict mode) | Static type checking across the monorepo |
| Bun | Runtime, test runner, package manager, built-in SQLite driver |
| LangGraph | Pipeline state machine with conditional edges |
| Drizzle ORM | Type-safe SQLite schema and queries |

## Models Used in the System

| Model | Task | Why chosen |
|-------|------|------------|
| `google/gemini-2.0-flash-001` via OpenRouter | Ad copy generation | Fast, cost-effective, strong creative writing with structured output support |
| `google/gemini-2.0-flash-001` via OpenRouter | LLM-as-judge evaluation | Consistent structured scoring with rationale, good instruction following for rubric adherence |
| Claude Opus 4.6 (`claude-opus-4-6`) | Development orchestration | Used via Claude Code for all architecture, implementation, and testing work |

## Significant Prompts

### Evaluation System Prompt

**Purpose**: Score ad copy across 5 weighted dimensions using a consistent rubric.

**Key elements**:
- Varsity Tutors brand voice definition (empowering, knowledgeable, approachable, results-focused)
- 5 evaluation dimensions with explicit weights: clarity (20%), value proposition (25%), CTA (20%), brand voice (15%), emotional resonance (20%)
- 4-tier scoring rubric: 1-3 Poor, 4-6 Below Average, 7-8 Good, 9-10 Excellent
- Two few-shot examples: a good ad (~8.0 score) and a poor ad (~4.0 score) with per-dimension scores and rationale
- Structured JSON output format enforced via Zod schema

**Iteration history**: The few-shot examples were designed to anchor scoring ranges and prevent score inflation. The two-example approach (good + poor) establishes both ends of the quality spectrum.

### Generation System Prompt

**Purpose**: Create Facebook/Instagram ad copy matching a brief's specifications.

**Key elements**:
- Varsity Tutors brand identity and key selling points (1-on-1 tutoring, expert tutors, all subjects K-12 through college, flexible scheduling)
- Output format: primaryText (2-4 sentences), headline (5-10 words), description (1 sentence), callToAction (button text)
- Instruction to match the brief's emotional angle, hook style, and body pattern

### Regeneration Prompt

**Purpose**: Improve a previously generated ad by targeting its weakest scoring dimension.

**Key elements**:
- Includes the full previous ad copy
- All 5 dimension scores with rationale from the evaluation
- Explicitly names the weakest dimension as the improvement target
- Instructs the model to maintain or improve quality on all other dimensions (preventing regression)

**Design rationale**: By providing the full evaluation context, the model understands both what to fix and what to preserve. The explicit "do not sacrifice strengths" instruction addresses the common failure mode where improving one dimension degrades others.
