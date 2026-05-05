---
title: Primitives
status: active
---

# Policy: Product Primitives

## Applies To

Product copy, domain models, APIs, UI labels, reports, and documentation.

## Rule

Use the current product nouns consistently: Objective, Research Context, Session,
Hypothesis, Experiment, Evaluation, Activity, Artifact, and Event.

## Required Checks

- User-facing surfaces use simple product nouns.
- Objectives describe why the research exists.
- Sessions are the primary user-facing research run. They own the objective,
  research context, hypotheses, experiments, evaluations, activities, artifacts,
  and events for one autoresearch attempt.
- Hypotheses are lightweight research threads with minimal status.
- Experiments are concrete attempts and may link to many hypotheses.
- Evaluations are lightweight measurement threads for baseline, candidate,
  reproduction, sanity, and blocked setup evidence.
- Activities carry results, concerns, comments, decisions, and interpretations.
- Evaluation activities carry raw measurement evidence, repeated runs,
  reproduction notes, and concern-like observations.
- Artifacts preserve inspectable receipts.
- Events power internal runtime/session timelines.
- Signal, Finding, Warning, Direction, Decision, Variant, Report, and broad
  Health are treated as deferred or activity-shaped concepts.

## Red Flags

- User-facing terms like world model, belief graph, trajectory engine, or
  execution substrate.
- Experiments shown as an undifferentiated event stream.
- Adding first-class Variants, Directions, Decisions, Findings, Warnings, or
  Evidence before the current loop works.
- Multiplying statuses when a short activity would capture the nuance better.
- Calling the first observability summary a health model.
- Making evaluations the primary workflow object instead of the evidence layer
  underneath hypotheses and experiments.
