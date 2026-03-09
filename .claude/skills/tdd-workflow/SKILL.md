---
name: tdd-workflow
description: Test-Driven Development workflow for Nerdy Ad Engine. Use when writing tests, implementing features with TDD, or when asked about test-first development, red-green-refactor, or testing patterns.
---

# TDD Workflow

## Red-Green-Refactor Cycle

### 1. RED -- Write a Failing Test
- Understand the requirement
- Write a test that describes the expected behavior
- Run `bun test` -- confirm it FAILS
- Commit: `test(scope): add failing test for [feature]`

### 2. GREEN -- Make It Pass
- Write the MINIMUM code to make the test pass
- No extra features, no "while I'm here" changes
- Run `bun test` -- confirm it PASSES
- Commit: `feat(scope): implement [feature]`

### 3. REFACTOR -- Improve the Code
- Clean up the implementation
- Remove duplication, improve naming
- Run `bun test` -- confirm tests still PASS
- Commit: `refactor(scope): clean up [feature]`

## Test Quality Rules

**Good tests:**
- Test behavior, not implementation
- One assertion per test (when practical)
- Descriptive names: `should [behavior] when [condition]`
- Independent -- no shared mutable state between tests
- Fast -- mock external dependencies (OpenRouter, LangSmith)

## Test Structure (Arrange-Act-Assert)

```typescript
import { describe, it, expect } from "bun:test";

describe("evaluateAd", () => {
  it("should return scores for all 5 dimensions", () => {
    // Arrange
    const ad = {
      primaryText: "Raise your SAT score 200+ points",
      headline: "Expert SAT Prep",
      description: "1-on-1 tutoring tailored to you",
      cta: "Get Started",
    };

    // Act
    const result = evaluateAd(ad);

    // Assert
    expect(result.scores).toHaveLength(5);
    expect(result.scores.every(s => s.value >= 1 && s.value <= 10)).toBe(true);
  });
});
```

## When to Mock

**DO mock:** OpenRouter API calls, LangSmith traces, Playwright browser, SQLite (when testing logic above DB layer)
**DON'T mock:** The code you're testing, Zod schemas, pure utility functions, Drizzle query builders

## TDD Checklist

Before implementing any feature:
1. Ask: "What test would prove this works?"
2. Write that test
3. Run it -- watch it fail (RED)
4. Implement the minimum to pass
5. Run it -- watch it pass (GREEN)
6. Clean up if needed (REFACTOR)
7. Repeat for the next behavior

## Testing the LangGraph Pipeline

For the agentic loop, test each node independently:
- **generate node**: Mock OpenRouter, verify output shape matches `GeneratedAd`
- **evaluate node**: Mock OpenRouter, verify 5 dimension scores + rationale
- **diagnose node**: Pure logic — pass in scores, verify weakest dimension identified
- **decision node**: Pure logic — pass in aggregate score, verify routing
- **publish node**: Mock DB, verify ad is stored with evaluation history

Integration tests run the full graph with mocked LLM responses.
