---
title: Primitives
status: active
---

# Policy: Product Primitives

## Applies To

Product copy, domain models, APIs, UI labels, reports, and documentation.

## Rule

Use the MVP product nouns consistently: Goal, Evaluation Context, Run,
Experiment, Evidence, Signal, Finding, Event, Warning.

## Required Checks

- User-facing surfaces use simple product nouns.
- Experiments are the main ledger entries.
- Evidence captures what came back from experiments.
- Findings summarize what was learned across evidence.
- Events power the live timeline.
- Warnings explain why a result is suspicious.
- Best observed signals are supporting details, not the central product object.
- Direction, Decision, Variant, Report, and broad Health are treated as deferred
  concepts.

## Red Flags

- User-facing terms like world model, belief graph, trajectory engine, or
  execution substrate.
- Experiments shown as an undifferentiated event stream.
- Adding first-class Variants, Directions, Decisions, or Reports before the slim
  loop works.
- Calling the first observability summary a health model.
