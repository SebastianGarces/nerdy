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
- Three few-shot examples: a good ad (~7.8 VT ad), a mediocre ad (~6.0 Kumon ad), and a poor ad (~3.5 Tutor.com ad) -- all sourced from real competitor ads scraped from Meta Ad Library
- Structured JSON output format enforced via Zod schema
- Specificity penalty: ads without concrete numbers have their value proposition dimension capped at 5, incentivizing the generator to include specific claims

**Iteration history**: The few-shot examples were designed to anchor scoring ranges and prevent score inflation. The three-example approach (good + mediocre + poor) establishes the full quality spectrum with real-world calibration data.

### Generation System Prompt

**Purpose**: Create Facebook/Instagram ad copy matching a brief's specifications.

**Key elements**:
- Varsity Tutors brand identity and key selling points (1-on-1 tutoring, expert tutors, all subjects K-12 through college, flexible scheduling)
- Output format: primaryText (2-4 sentences), headline (5-10 words), description (1 sentence), callToAction (button text)
- Instruction to match the brief's emotional angle, hook style, and body pattern
- Mandatory writing rules enforcing specificity: require concrete numbers (percentages, timeframes, counts), max 12 words per sentence, mathematical/logical structure (before/after framing, if/then patterns), and a banned filler phrase list (e.g., "unlock your potential", "journey to success")
- Proof point injection — if the brief includes `proofPoints`, the generator is instructed to weave them into the copy as concrete claims

### Regeneration Prompt

**Purpose**: Improve a previously generated ad by targeting its weakest scoring dimension.

**Key elements**:
- Includes the full previous ad copy
- All 5 dimension scores with rationale from the evaluation
- Explicitly names the weakest dimension as the improvement target
- Instructs the model to maintain or improve quality on all other dimensions (preventing regression)

**Design rationale**: By providing the full evaluation context, the model understands both what to fix and what to preserve. The explicit "do not sacrifice strengths" instruction addresses the common failure mode where improving one dimension degrades others.

### Persona System

**Purpose**: Generate audience-targeted briefs using 7 predefined personas.

**Key elements**:
- 7 personas covering the primary VT audience segments (e.g., anxious parent, ambitious student, comparison shopper)
- Each persona includes demographic details, pain points, and messaging preferences
- Brief generator selects appropriate personas based on campaign prompt
- See [ADR 0008](../decisions/0008-integrate-vt-messaging-guidance.md)

### Brief Generation Prompt (promptToBriefs)

**Purpose**: Generate structured ad briefs from a natural language campaign description.

**Key elements**:
- Takes a freeform campaign prompt (e.g., "Back-to-school campaign targeting parents of high schoolers struggling with math")
- Returns an array of AdBrief objects matching the schema: audience, campaignGoal, emotionalAngle, offerType, hookStyle, bodyPattern
- Each brief is a unique combination tailored to the campaign description
- Generates a `proofPoints` array per brief — 2-3 concrete numerical claims (e.g., "200+ point SAT improvement in 8 weeks") that seed the generator with specific numbers to use in ad copy
- Falls back to matrix-based generateBriefs if the LLM call fails
