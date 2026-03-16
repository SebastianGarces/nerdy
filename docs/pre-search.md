# Pre-Search: Autonomous Ad Content Generation System

## Context

Building an autonomous ad engine for Varsity Tutors (Nerdy) that generates Facebook & Instagram ad copy, evaluates quality across 5 dimensions, and measurably improves over time. The north star metric is **performance per token** — quality per dollar of API spend.

Starting with **v1 (text-only pipeline)**, architected to scale toward **v3 (full autonomous engine)**. Solo project.

---

## Decisions **Made**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language & Runtime | **Bun + TypeScript** | Fast runtime, built-in test runner, native TS support |
| LLM Provider | **Gemini via OpenRouter** | Spec-recommended for copy generation; OpenRouter gives flexibility to swap models later |
| Data Storage | **SQLite + Drizzle ORM** | Lightweight, type-safe, single-file DB. Good for local dev, portable for deployment |
| Web Framework (Backend) | **Elysia** | Bun-native, type-safe, fast. Handles API routes for pipeline + dashboard |
| Frontend | **Next.js + Tailwind + shadcn/ui** | Standalone output, good component library. Dashboard for viewing ads, scores, trends |
| Repo Structure | **Bun monorepo** | `packages/pipeline` + `apps/dashboard` + `apps/server`. Bun workspace managed |
| Testing | **Bun test (built-in)** | Zero extra dependencies, Jest-compatible syntax |
| Secrets | **.env file** | Standard, gitignored. Simple for local dev |
| Scraping Approach | **Web scraping (Playwright)** | Manual trigger CLI command. Scrape Meta Ad Library web UI for competitor + Varsity Tutors ads |
| Competitor List | **Configurable** | Config file with default: Princeton Review, Kaplan, Khan Academy, Chegg, Varsity Tutors |
| Deployment Target | **Docker locally**, anticipate Railway | Dockerfile for both backend and Next.js standalone |
| Agent Framework | **LangGraph.js** | Graph-based agent orchestration. Explicit state machines for generate→evaluate→iterate flow. Part of LangChain ecosystem |
| Tracing / Observability | **LangSmith** | Native LangGraph integration, zero-config. Cloud-hosted, free tier. Full trace visibility on every LLM call |

---

## Research: Meta Ad Library Scraping

### What Data Is Available (Public)

- **Ad creative text** (primary text, headline, description)
- **Advertiser/Page name** and Page ID
- **Ad start and end dates** (when launched, when stopped)
- **Spend ranges** (not exact — bands like "$100-499", "$1K-5K")
- **Impression ranges** (for political/issue ads and EU/UK ads)
- **Publisher platforms** (Facebook, Instagram, etc.)
- **Media type** (video, static image, carousel)
- **Demographic breakdown** (age/gender targeting percentages — political/EU/UK ads)

### What Is NOT Available

- Exact spend figures
- Exact impressions
- Engagement metrics (likes, comments, shares)
- Click-through rates (CTR)
- Cost per click (CPC)
- Conversion data / ROAS

### Performance Inference Strategy

Since we can't get direct performance metrics, we use **ad longevity as a proxy**:

- **Only 11.3% of ads survive beyond 60 days** (research on 47,392 ads from 1,247 brands)
- Advertisers kill underperforming ads quickly — long-running ads = meeting KPIs
- Ads running 60+ days represent validated creative concepts
- **Our approach**: Scrape all ads, rank by duration, use longest-running as "good" calibration set

Additional signals:
- Number of ad variants (more variants = more investment = higher value campaign)
- Recurring copy patterns across multiple ads from same advertiser
- CTAs that appear most frequently (likely winners)

### URL Structure

```
https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q={advertiser_name}
```

Key params: `q` (search), `country`, `active_status`, `ad_type`, `publisher_platforms[]`, `media_type`

### Anti-Scraping Concerns

- IP-based rate limiting
- Bot detection on rapid automated requests
- Dynamic content loading (requires scroll handling)

**Mitigations**:
- Implement delays between requests (human-like pacing)
- Use Playwright with headful mode if needed
- Batch scraping sessions with pauses
- Respect rate limits — this is a manual trigger, not continuous scraping

### Legal Note

Federal court rulings support that scraping publicly accessible data is legal. However, Meta ToS violations can result in IP blocks. Our use is for competitive research, which is the intended purpose of the Ad Library.

---

## Potential Libraries & Tools

### Core Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `@langchain/langgraph` | Agent orchestration | Graph-based ReAct loop for generate→evaluate→iterate |
| `@langchain/openai` | LLM provider | OpenAI-compatible SDK works with OpenRouter endpoint |
| `langsmith` | Tracing / observability | Native LangGraph integration, zero-config tracing |
| `drizzle-orm` + `drizzle-kit` | ORM + migrations | Type-safe SQLite access |
| `better-sqlite3` | SQLite driver | Fast, synchronous, works with Bun |
| `playwright` | Web scraping | Meta Ad Library scraping via headless browser |
| `elysia` | Backend HTTP server | Bun-native, type-safe routes |
| `zod` | Schema validation | Validate ad briefs, evaluation scores, API responses |
| `nanoid` | ID generation | Short unique IDs for ads, briefs, evaluation runs |

### Dashboard Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework (standalone output) |
| `tailwindcss` | Utility-first CSS |
| `shadcn/ui` | Component library |
| `recharts` or `chart.js` | Quality trend visualization |
| `@tanstack/react-query` | Data fetching + caching |

### Dev / Tooling

| Package | Purpose |
|---------|---------|
| `typescript` | Type checking |
| `docker` + `docker-compose` | Containerization |
| `biome` or `eslint` | Linting |

---

## Technical Architecture

### Monorepo Structure

```
nerdy/
├── packages/
│   ├── pipeline/          # Core ad generation + evaluation logic
│   │   ├── src/
│   │   │   ├── generate/  # Ad copy generation from briefs
│   │   │   ├── evaluate/  # 5-dimension scoring, LLM-as-judge
│   │   │   ├── iterate/   # Feedback loop, improvement strategies
│   │   │   ├── scrape/    # Meta Ad Library scraper
│   │   │   ├── db/        # Drizzle schema, migrations, queries
│   │   │   └── types/     # Shared TypeScript types
│   │   └── tests/
│   └── shared/            # Shared types, constants, utils
├── apps/
│   ├── server/            # Elysia API server
│   │   ├── src/
│   │   │   └── routes/    # API endpoints
│   │   └── Dockerfile
│   └── dashboard/         # Next.js frontend
│       ├── src/
│       │   ├── app/       # App router pages
│       │   └── components/
│       └── Dockerfile
├── docker-compose.yml
├── bun.lockb
├── package.json           # Workspace root
└── .env
```

### Data Flow

```
1. SCRAPE: Meta Ad Library → SQLite (competitor ads + duration signals)
2. CALIBRATE: Score scraped ads with evaluator → establish baseline
3. GENERATE: Brief → Gemini (via OpenRouter) → raw ad copy
4. EVALUATE: Raw ad → LLM-as-judge → 5 dimension scores + rationale
5. ITERATE: Score < 7.0 → identify weakest dimension → targeted regeneration
6. STORE: Passing ads → SQLite ad library with full evaluation history
7. VISUALIZE: Dashboard reads from SQLite → shows trends, ads, scores
```

### Database Schema (Key Tables)

- `competitor_ads` — scraped ads with text, dates, duration, advertiser
- `ad_briefs` — input briefs (audience, product, goal, tone)
- `generated_ads` — primary text, headline, description, CTA, generation metadata
- `evaluations` — per-ad scores across 5 dimensions + rationale + confidence
- `iteration_logs` — cycle tracking, before/after metrics, intervention type
- `token_usage` — track tokens spent per generation/evaluation call (ROI tracking)

---

## Execution Plan

### Phase 1: Foundation (Day 1)
1. Set up Bun monorepo with workspace config
2. Set up Drizzle + SQLite schema
3. Implement Meta Ad Library scraper (Playwright)
4. Scrape Varsity Tutors + 4 competitors
5. Store scraped ads in SQLite

### Phase 2: Evaluator First (Day 1-2)
1. Build LLM-as-judge evaluator (5 dimensions)
2. Score scraped ads to calibrate — long-running ads should score higher
3. Tune evaluation prompts until calibration makes sense
4. Add confidence scoring

### Phase 3: Generator + Loop (Day 2)
1. Build ad copy generator from briefs
2. Wire feedback loop: generate → evaluate → identify weakness → regenerate
3. Quality threshold enforcement (7.0/10 minimum)
4. Generate 50+ ads across varied briefs

### Phase 4: Dashboard + Polish (Day 3)
1. Elysia API routes for ads, evaluations, trends
2. Next.js dashboard with shadcn components
3. Quality trend visualization (charts)
4. Docker setup for both services

### Phase 5: Documentation
1. Decision log (ongoing throughout)
2. Technical writeup
3. Limitations documentation
4. Demo prep

---

## Agentic Loop Architecture (LangGraph.js)

### Why LangGraph

LangGraph provides graph-based agent orchestration with explicit state machines. This maps cleanly to our ad generation pipeline where each step has clear inputs, outputs, and branching logic. It's part of the LangChain ecosystem, which gives us native LangSmith tracing for free.

### Graph Design

```
                    ┌─────────────┐
                    │  START      │
                    │  (Ad Brief) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  GENERATE   │
                    │  (Gemini)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  EVALUATE   │
                    │  (LLM Judge)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                  ┌─┤  DECISION   ├─┐
                  │ │  (≥7.0?)    │ │
                  │ └─────────────┘ │
             YES  │                 │  NO
                  │                 │
           ┌──────▼──────┐  ┌──────▼──────┐
           │  PUBLISH     │  │  DIAGNOSE   │
           │  (Add to lib)│  │  (Weakest   │
           └──────┬──────┘  │   dimension) │
                  │         └──────┬──────┘
                  │                │
                  │         ┌──────▼──────┐
                  │         │  RETRY?     │
                  │         │  (< max N?) │
                  │         └──────┬──────┘
                  │           │         │
                  │      YES  │    NO   │
                  │           │         │
                  │    ┌──────▼───┐ ┌───▼─────┐
                  │    │ RE-GEN   │ │  DISCARD │
                  │    │ (target  │ │  (log    │
                  │    │  weak    │ │  failure)│
                  │    │  dim)    │ └───┬─────┘
                  │    └────┬────┘     │
                  │         │          │
                  │    (back to        │
                  │     EVALUATE)      │
                  │                    │
                  └────────┬───────────┘
                    ┌──────▼──────┐
                    │    END      │
                    └─────────────┘
```

### Graph State Schema

```typescript
interface AdGraphState {
  brief: AdBrief;                    // Input brief
  currentAd: GeneratedAd | null;    // Current ad being evaluated
  evaluations: Evaluation[];         // History of evaluations for this brief
  iteration: number;                 // Current iteration count
  maxIterations: number;             // Max retries (default: 3)
  weakestDimension: string | null;   // Identified weak point for targeted regen
  status: 'generating' | 'evaluating' | 'improving' | 'approved' | 'discarded';
  tokenUsage: TokenUsage;           // Running token count for ROI
}
```

### Node Implementations

| Node | LLM Call | Purpose |
|------|----------|---------|
| `generate` | Gemini (via OpenRouter) | Create ad copy from brief (or targeted regen prompt) |
| `evaluate` | Gemini (via OpenRouter) | Score ad on 5 dimensions, return structured JSON |
| `diagnose` | No LLM call | Identify weakest dimension from evaluation scores |
| `decision` | No LLM call | Route based on aggregate score vs threshold |
| `publish` | No LLM call | Write passing ad to SQLite library |
| `discard` | No LLM call | Log failure, record why it couldn't be improved |

### Batch Orchestration

For generating 50+ ads:
- Create an array of briefs (varied audiences, goals, tones)
- Run graphs in parallel (configurable concurrency, e.g., 5 at a time)
- Each graph instance is independent — own state, own iteration history
- Aggregate results across all graphs for trend analysis

### Key LangGraph Features We Use

- **Conditional edges**: Route between publish/diagnose/discard based on score
- **Cycles**: Evaluate → diagnose → regenerate → evaluate loop
- **State persistence**: Full state history for every ad's journey through the graph
- **Checkpointing**: Resume interrupted batch runs

---

## Tracing & Observability (LangSmith)

### Integration

LangSmith integrates natively with LangGraph — every node execution, LLM call, and state transition is automatically traced. Zero additional code required beyond setting environment variables:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=<key>
LANGCHAIN_PROJECT=nerdy-ad-engine
```

### What We Trace

| Trace Point | Data Captured |
|-------------|--------------|
| Generation calls | Prompt, response, tokens used, latency, model |
| Evaluation calls | Ad text, scores per dimension, rationale, confidence |
| Iteration cycles | Before/after scores, which dimension was targeted |
| Graph execution | Full state at each node, routing decisions |
| Token usage | Input/output tokens per call, mapped to cost |
| Failures | Stuck briefs, evaluation disagreements, API errors |

### Benefits for This Project

1. **Debug evaluation quality**: See exactly what the LLM-as-judge is reasoning about each dimension
2. **Track improvement**: Compare traces across itercleation cycles to verify quality gains
3. **Cost visibility**: Token usage per ad, per iteration, per batch — feeds into ROI tracking
4. **Decision log evidence**: Traces serve as proof of iteration methodology for the submission
5. **Identify patterns**: Which prompts produce higher scores? Which dimensions are hardest to improve?

---

## Brand Guidelines & Tone (Varsity Tutors / Nerdy)

These are hard constraints — every generated ad MUST align with these. They are not "varied tones" to experiment with. The brand voice is fixed; what varies is the **audience segment**, **campaign goal**, and **emotional angle**.

### Brand Voice (Non-Negotiable)

- **Empowering**: "You can do this. We'll help you get there."
- **Knowledgeable**: Expert authority without being condescending
- **Approachable**: Warm, conversational, not corporate
- **Results-focused**: Lead with outcomes, not features

### Brand Do's

- Lead with outcomes ("raise your SAT score 200+ points") not features ("we have tutors")
- Be confident but not arrogant
- Be expert but not elitist
- Meet people where they are
- Use specific numbers and proof points
- Include social proof (reviews, ratings, student counts)

### Brand Don'ts

- Don't be generic ("we're the best tutoring service")
- Don't be fear-mongering without offering a solution
- Don't make unsubstantiated claims
- Don't use jargon or overly academic language
- Don't mention competitors by name in ads
- Don't use real PII

### Primary Audience: SAT Test Prep

| Segment | Emotional Driver | Messaging Angle |
|---------|-----------------|-----------------|
| **Parents** anxious about college admissions | Worry, responsibility, wanting the best for their child | "Give your child every advantage" — reassurance + results |
| **High school students** stressed about scores | Anxiety, pressure, wanting to prove themselves | "You've got this" — empowerment + achievable goals |
| **Families** comparing prep options | Decision fatigue, value-seeking, trust | "Here's why families choose us" — social proof + differentiation |

### What Varies (Brief Parameters)

When generating varied briefs, these are the axes of variation — NOT the brand voice:

1. **Audience segment**: Parent vs. student vs. family
2. **Campaign goal**: Awareness (top of funnel) vs. conversion (bottom of funnel)
3. **Emotional angle**: Aspiration vs. anxiety-relief vs. social proof vs. urgency
4. **Offer type**: Free trial, free practice test, consultation, limited-time discount
5. **Hook style**: Question hook, stat hook, story hook, fear hook (per the spec's "What Works on Meta" section)

### Ad Copy Patterns (From Spec)

**Hook types to rotate through:**
- Question: "Is your child's SAT score holding them back?"
- Stat: "Students who prep score 200+ points higher on average."
- Story: "My daughter went from a 1050 to a 1400 in 8 weeks."
- Fear: "The SAT is 3 months away. Is your student ready?"

**Body patterns to rotate through:**
- Problem → agitate → solution → proof → CTA
- Testimonial → benefit → CTA
- Stat → context → offer → CTA

**CTA matching to funnel stage:**
- Awareness: "Learn More"
- Consideration: "Take a Free Practice Test"
- Conversion: "Sign Up", "Get Started", "Book Your Free Session"

### Brief Template

```typescript
interface AdBrief {
  audience: 'parent' | 'student' | 'family';
  campaignGoal: 'awareness' | 'conversion';
  emotionalAngle: 'aspiration' | 'anxiety-relief' | 'social-proof' | 'urgency';
  offerType: string;       // e.g., "free practice test", "free consultation"
  hookStyle: 'question' | 'stat' | 'story' | 'fear';
  bodyPattern: 'problem-agitate-solution' | 'testimonial-benefit' | 'stat-context-offer';
  // Brand voice is NOT a parameter — it's always Varsity Tutors
}
```

This gives us **2 × 2 × 4 × N × 4 × 3 = 192×N** unique brief combinations (where N = number of offer types). More than enough to generate 50+ distinct ads while staying on-brand.

---

## Quality Evaluation Framework

### Five Dimensions (from spec)

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Clarity | 20% | Message understandable in < 3 seconds |
| Value Proposition | 25% | Specific, differentiated benefit communicated |
| Call to Action | 20% | Clear, compelling, low-friction next step |
| Brand Voice | 15% | Sounds like Varsity Tutors (empowering, knowledgeable, approachable) |
| Emotional Resonance | 20% | Taps into real motivation (parent worry, student ambition, test anxiety) |

**Weighting rationale**: Value Proposition weighted highest because the spec emphasizes "specific numbers > vague promises" and differentiation from competitors. Brand Voice weighted lowest for v1 since we're still calibrating what VT sounds like. These weights are configurable.

### Scoring Approach
- LLM-as-judge with structured JSON output
- Each dimension scored 1-10 with written rationale
- Confidence score (0-1) per evaluation
- Aggregate = weighted average across dimensions
- Threshold: 7.0/10 to enter the ad library

### Iteration Strategy
- Identify weakest dimension on failed ads
- Targeted regeneration: re-prompt focusing on the weak dimension specifically
- Max 3 regeneration attempts per brief before flagging as "stuck"
- Track which interventions improve which dimensions

---

## Latency & Performance Tracking

### What to Track (Per the Spec)

The spec's north star is **performance per token**. Combined with the evaluation criteria, here's everything we need to instrument from day one:

### Per-LLM-Call Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| **Latency (ms)** | Timer around API call | Track generation vs evaluation speed |
| **Input tokens** | OpenRouter response headers | Cost calculation |
| **Output tokens** | OpenRouter response headers | Cost calculation |
| **Model used** | Request config | Compare model efficiency |
| **Call type** | Our label: `generate` / `evaluate` / `regenerate` | Break down cost by purpose |
| **Status** | Success / error / timeout | Reliability tracking |
| **Temperature** | Request config | Reproducibility |

### Per-Ad Metrics

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| **Total tokens per ad** | Sum of all LLM calls for this ad | Cost per ad |
| **Total cost per ad ($)** | Tokens × OpenRouter price per token | ROI denominator |
| **Total latency per ad** | Sum of all call latencies | Speed of generation |
| **Iterations to pass** | Count of generate→evaluate cycles | Efficiency of improvement |
| **Final quality score** | Weighted avg of 5 dimensions | ROI numerator |
| **Quality per dollar** | Final score / total cost | **North star metric** |
| **Quality per token** | Final score / total tokens | Alternative ROI metric |

### Per-Batch Metrics

| Metric | Calculation | Purpose |
|--------|-------------|---------|
| **Batch size** | Count of briefs in batch | Scale tracking |
| **Pass rate** | Ads ≥ 7.0 / total generated | System effectiveness |
| **Avg iterations to pass** | Mean cycles for passing ads | Improvement efficiency |
| **Avg cost per passing ad** | Total batch cost / passing ads | True cost of quality |
| **Total batch latency** | Wall clock time for full batch | Throughput |
| **Ads per minute** | Batch size / (latency in min) | Speed of optimization metric (15% of grade) |
| **Quality trend** | Score improvement across cycles | Iteration & improvement metric (20% of grade) |
| **Discard rate** | Ads that never reached 7.0 / total | Failure detection |

### Per-Cycle Metrics (Improvement Tracking)

| Metric | Purpose |
|--------|---------|
| **Avg score at cycle N** | Show quality improves per iteration |
| **Score delta per dimension per cycle** | Which dimensions improve, which plateau |
| **Which intervention improved which dimension** | Required by spec — maps strategy to result |
| **Cumulative tokens spent at cycle N** | Cost of improvement at each step |

### LangSmith Trace Enrichment

Beyond automatic LangGraph tracing, we add custom metadata to each trace:

```typescript
// Attach to every LLM call via LangSmith run metadata
{
  ad_id: string;
  brief_id: string;
  batch_id: string;
  iteration: number;
  call_type: 'generate' | 'evaluate' | 'regenerate';
  target_dimension?: string;  // For targeted regeneration
  cost_usd: number;
  quality_score?: number;     // After evaluation
}
```

This lets us query LangSmith for:
- "Show me all traces where regeneration targeting 'emotional_resonance' improved the score"
- "What's the avg cost per passing ad this week vs last week?"
- "Which briefs consistently get stuck below 7.0?"

### Storage Schema

```sql
-- Token/cost tracking table
CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  ad_id TEXT REFERENCES generated_ads(id),
  batch_id TEXT,
  call_type TEXT,          -- 'generate' | 'evaluate' | 'regenerate'
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,
  latency_ms INTEGER,
  iteration INTEGER,
  target_dimension TEXT,   -- NULL for initial gen, dimension name for regen
  status TEXT,             -- 'success' | 'error' | 'timeout'
  created_at TEXT
);
```

### Latency Budgets (Targets)

| Operation | Target Latency | Notes |
|-----------|---------------|-------|
| Single ad generation | < 5s | Gemini via OpenRouter |
| Single ad evaluation | < 3s | Structured JSON output, smaller prompt |
| Full iteration cycle (gen + eval) | < 10s | One round of generate → evaluate |
| Full ad with 3 retries | < 40s | Worst case: 3 iterations + final eval |
| Batch of 50 ads (5 concurrent) | < 10 min | Parallelism helps significantly |
| Meta Ad Library scrape (per competitor) | < 2 min | Depends on number of ads, scroll depth |

### Dashboard Visualizations Needed

1. **Quality trend line**: Avg score per iteration cycle (x: cycle, y: avg score)
2. **Cost per passing ad over time**: Track if system gets more efficient
3. **Dimension radar chart**: Per-ad breakdown across 5 dimensions
4. **Pass/fail distribution**: Histogram of final scores
5. **Token usage breakdown**: Pie chart of tokens by call type (generate vs evaluate vs regen)
6. **Latency distribution**: Histogram of per-ad total latency

---

## Security Concerns

| Concern | Mitigation |
|---------|------------|
| API keys in .env | `.gitignore` the .env file, document required vars in `.env.example` |
| No real PII in generated content | Validation step: reject any generated ad containing PII patterns (emails, phone numbers, real names) |
| Rate limiting on OpenRouter | Implement token budget per session, track usage in `token_usage` table |
| Meta Ad Library scraping | Human-like delays, respect rate limits, no login required (public data) |
| SQLite file access | Local only for v1. For Railway deployment, use volume mounts |
| LLM output safety | Post-generation filter for inappropriate content, competitor mentions, false claims |

---

## Cost & ROI Tracking

- Track tokens (input + output) per API call
- Map to dollar cost via OpenRouter pricing
- Calculate: cost per generated ad, cost per *passing* ad (>7.0 score)
- Performance-per-token = average quality score / tokens spent
- Store in `token_usage` table for trend analysis

---

## Open Questions & Risks

1. **Scraper fragility**: Meta Ad Library UI may change. Mitigation: modular scraper with selectors in config, easy to update.
2. **LLM-as-judge reliability**: LLM evaluators can be inconsistent. Mitigation: confidence scores, multiple evaluation passes for borderline ads, calibration against scraped reference set.
3. **Gemini via OpenRouter rate limits**: May hit limits during batch generation of 50+ ads. Mitigation: implement retry with exponential backoff, batch with delays.
4. **Ad duration ≠ ad quality**: Long-running ads are a proxy, not ground truth. Some may run for brand awareness regardless of performance. Mitigation: combine duration with other signals (multiple variants, recurring patterns).
5. **No real performance data**: Without CTR/conversion data, our quality assessment is based on heuristics and LLM judgment. This is an acknowledged limitation to document in the decision log.

---

## Key Differentiators (What Makes This Submission Stand Out)

1. **Competitive intelligence from Meta Ad Library** (+10 bonus points) — scraping real competitor data as calibration
2. **Performance-per-token tracking** (+2 bonus) — ROI awareness from day one
3. **Quality trend visualization** (+2 bonus) — dashboard with charts
4. **Self-healing feedback loops** (+7 bonus) — targeted regeneration on weakest dimension
5. **Honest decision log** — document what works, what doesn't, and why
