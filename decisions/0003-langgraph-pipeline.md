# 0003. LangGraph for Pipeline Orchestration

**Date**: 2026-03-09
**Status**: accepted

## Context

The ad generation pipeline requires a self-healing loop: generate an ad, evaluate it, and if it falls below the quality threshold (7.0/10), diagnose the weakest dimension, regenerate targeting that dimension, and re-evaluate. This loop must handle three terminal states (published, discarded, or max iterations reached) and persist all intermediate state to the database.

## Decision

Use LangGraph's `StateGraph` to model the pipeline as a compiled state machine with 6 nodes and conditional edges:

```
generate -> evaluate -> decide --(score >= 7.0)--> publish -> END
                                --(retries left)--> regenerate -> evaluate (loop)
                                --(no retries)----> discard -> END
```

State is managed through LangGraph's annotation system, with fields for the current ad, evaluation history, iteration count, weakest dimension, and pipeline status.

## Consequences

**Positive**:
- Clear, declarative pipeline definition -- the graph topology is visible in ~15 lines of code
- Conditional edges make routing logic explicit and testable
- Built-in state management eliminates manual state threading between nodes
- LangSmith tracing integration is available for debugging pipeline runs
- Each node is an independent async function, easy to test in isolation

**Negative**:
- LangGraph adds a dependency on the LangChain ecosystem (`@langchain/langgraph`, `@langchain/openai`)
- The compiled graph is opaque -- debugging requires LangSmith or logging within nodes
- State annotations use a specific API that differs from plain TypeScript types

## Alternatives Considered

- **Plain async functions with manual looping**: A simple `while` loop calling generate/evaluate/decide. Rejected because state management becomes ad-hoc and error handling is harder to structure.
- **Custom state machine library (xstate)**: More general-purpose but adds complexity for a pipeline that maps naturally to LangGraph's DAG model. Also lacks LLM-specific integrations.
- **LangChain LCEL chains**: LangChain Expression Language supports chaining but does not natively support conditional branching or loops, which are core to the iteration pattern.
