---
title: Primitives
status: active
---

# Policy: Product Primitives

## Applies To

Product copy, domain models, APIs, UI labels, reports, and documentation.

## Rule

Use the current product nouns consistently: Workspace, Project, Session, Agent,
Task, Hypothesis, Experiment, Evaluation, Activity, Artifact, and Event.

## Required Checks

- User-facing surfaces use simple product nouns.
- Workspaces are the folder boundary and own local Situ state for a repo path.
- Projects are workspace-owned research efforts. They carry the effort's
  objective and research context.
- A project's objective describes why it exists. Research context describes how
  progress is judged. They are fields on Project, not standalone first-slice
  primitives.
- Sessions are the primary user-facing research run. They belong to a workspace
  and may attach to zero or one project. They own lifecycle and runtime
  association, not the durable research or coordination ledger. There is no
  stored "active session" pointer; the most-recently-updated session is derived
  on demand.
- Hypotheses, experiments, evaluations, their research activities, and
  artifacts are project-required (`project_id` is NOT NULL on each durable
  research record that needs direct project ownership). They may carry optional
  `created_in_session_id` provenance, but session is not their owner.
- Agents are durable project participants such as manager and scientist.
- Tasks are project-scoped work orders for coordinating focused agent work.
  They can link to produced hypotheses, experiments, evaluations, activities,
  artifacts, and events, but those ledger records remain the research output.
- Agent message history, task dependencies, task entity links, and task
  activities are project-owned coordination records. Session fields on those
  records are provenance, not ownership.
- Hypotheses are lightweight research threads with minimal status.
- Experiments are concrete attempts and may link to many hypotheses.
- Evaluations are lightweight measurement threads for baseline, candidate,
  reproduction, sanity, and blocked setup evidence. They may optionally
  reference the experiment they measure.
- Activities carry results, concerns, comments, decisions, and interpretations.
  Research activities reach a project through their parent and do not carry a
  `session_id` column.
- Evaluation activities carry raw measurement evidence, repeated runs,
  reproduction notes, and concern-like observations.
- Task activities carry coordination notes, claim context, user steering, and
  completion/failure context.
- Artifacts preserve inspectable receipts and always belong to a project.
- Events power internal runtime, project, and session timelines. They use
  optional `associated_project_id` and `associated_session_id` fields rather
  than a single owner field, because an event may concern a project, a session,
  both, or neither.
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
