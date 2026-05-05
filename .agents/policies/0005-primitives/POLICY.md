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
- Projects are the workspace boundary and own sessions
  (`sessions.project_id` is required).
- Objectives describe why the research exists. Each session owns its
  objective as a separate 1:1 record (`objectives.session_id` required and
  unique). The agent populates the objective via `create_objective` on
  session kickoff.
- Research context describes how progress is judged. Each session owns its
  research context as a separate 1:1 record (`research_contexts.session_id`
  required and unique). The agent populates it via `create_research_context`
  on session kickoff.
- Sessions are the primary user-facing research run. They own the objective
  record, research context record, hypotheses, experiments, evaluations,
  activities, artifacts, and events for one autoresearch attempt. There is
  no stored "active session" pointer; the most-recently-updated session is
  derived on demand.
- Hypotheses, experiments, evaluations, and artifacts are session-required
  (`session_id` is NOT NULL on each).
- Hypotheses are lightweight research threads with minimal status.
- Experiments are concrete attempts and may link to many hypotheses.
- Evaluations are lightweight measurement threads for baseline, candidate,
  reproduction, sanity, and blocked setup evidence. They may optionally
  reference the experiment they measure.
- Activities carry results, concerns, comments, decisions, and interpretations.
  They reach a session through their parent and do not carry a `session_id`
  column.
- Evaluation activities carry raw measurement evidence, repeated runs,
  reproduction notes, and concern-like observations.
- Artifacts preserve inspectable receipts and always belong to a session.
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
