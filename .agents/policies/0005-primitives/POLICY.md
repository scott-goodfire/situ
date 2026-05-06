---
title: Primitives
status: active
---

# Policy: Product Primitives

## Applies To

Product copy, domain models, APIs, UI labels, reports, and documentation.

## Rule

Use the current product nouns consistently: Workspace, Project, Session, Agent,
Task, Analysis, Hypothesis, Experiment, Evaluation, Activity, Artifact, and
Event.

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
- Analyses, hypotheses, experiments, evaluations, their research activities, and
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
- Analyses capture durable project understanding from codebase inspection,
  prior-art research, synthesis, constraints, opportunities, or open questions.
  They are not forced into hypotheses until they become testable improvement
  directions.
- Hypotheses are lightweight research threads with minimal status.
- Experiments are concrete attempts and may link to many hypotheses.
- Evaluations are lightweight measurement threads for baseline, candidate,
  reproduction, sanity, and blocked setup evidence. They may optionally
  reference the experiment they measure.
- Activities carry results, concerns, comments, decisions, source notes, and
  interpretations. Research activities reach a project through their parent and
  do not carry a `session_id` column.
- Evaluation activities carry raw measurement evidence, repeated runs,
  reproduction notes, and concern-like observations.
- Task activities carry coordination notes, claim context, user steering, and
  completion/failure context.
- Each entity that has activities owns its own `<Entity>ActivityKind` enum
  (`HypothesisActivityKind`, `ExperimentActivityKind`, `EvaluationActivityKind`,
  `AnalysisActivityKind`, `TaskActivityKind`). There is no shared `ActivityKind`
  enum across entities — each kind vocabulary evolves independently with its
  entity.
- Artifacts preserve inspectable receipts and always belong to a project.
- Events power internal runtime, project, and session timelines. They use
  optional `associated_project_id` and `associated_session_id` fields rather
  than a single owner field, because an event may concern a project, a session,
  both, or neither.
- Signal, Finding, Warning, Direction, Decision, Variant, Report, and broad
  Health are treated as deferred or activity-shaped concepts.

## Red Flags

- A shared `ActivityKind` enum used across multiple entity activity records.
  Each entity's activity has its own kind enum.
- User-facing terms like world model, belief graph, trajectory engine, or
  execution substrate.
- Experiments shown as an undifferentiated event stream.
- Adding first-class Variants, Directions, Decisions, Findings, Warnings, or
  Evidence before the current loop works.
- Multiplying statuses when a short activity would capture the nuance better.
- Calling the first observability summary a health model.
- Making evaluations the primary workflow object instead of the evidence layer
  underneath hypotheses and experiments.
