---
title: Primitives
status: active
---

# Policy: Product Primitives

## Applies To

Product copy, domain models, APIs, UI labels, reports, and documentation.

## Rule

Use the MVP product nouns consistently: Objective, Evaluation Context, Session,
Hypothesis, Experiment, Activity, Artifact, and Event.

## Required Checks

- User-facing surfaces use simple product nouns.
- Objectives describe why the research exists.
- Sessions are execution/runtime containers, not the main user-facing research
  object.
- Hypotheses are lightweight research threads with minimal status.
- Experiments are concrete attempts and may link to many hypotheses.
- Activities carry results, concerns, comments, decisions, and interpretations.
- Artifacts preserve inspectable receipts.
- Events power internal runtime/session timelines.
- Evidence, Signal, Finding, Warning, Direction, Decision, Variant, Report, and
  broad Health are treated as deferred or activity-shaped concepts.

## Red Flags

- User-facing terms like world model, belief graph, trajectory engine, or
  execution substrate.
- Experiments shown as an undifferentiated event stream.
- Adding first-class Variants, Directions, Decisions, Findings, Warnings, or
  Evidence before the slim loop works.
- Multiplying statuses when a short activity would capture the nuance better.
- Calling the first observability summary a health model.
