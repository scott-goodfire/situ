# Product Primitives

Use simple product nouns. For the first slice, keep the domain intentionally
small and let activities carry nuance.

## Current Hierarchy

```text
Workspace
  |-- Projects                     (workspace-owned research efforts)
  |     |-- Agents                      (project participants)
  |     |     `-- AgentMessageHistory
  |     |-- Tasks                       (agent work orders)
  |     |     |-- TaskDependencies
  |     |     |-- TaskEntityLinks
  |     |     `-- TaskActivity
  |     |-- Hypotheses                  (project_id required)
  |     |     `-- HypothesisActivity
  |     |-- Experiments                 (project_id required)
  |     |     `-- ExperimentActivity
  |     |-- Evaluations                 (project_id required)
  |     |     `-- EvaluationActivity
  |     |-- HypothesisExperimentLinks
  |     |-- Artifacts                   (project_id required)
  |     `-- Events                      (when project-associated)
  `-- Sessions                     (workspace_id required, project_id optional)
        `-- Events                      (when session-associated)
```

The workspace is the folder boundary and owns local Situ state for a repo path.
Projects are research efforts inside a workspace. A project carries the
objective and research context for that effort. Sessions are live autoresearch
runs inside a workspace, and may attach to zero or one project. A projectless
session is valid while setup or triage is still incomplete.

Projects own the durable research ledger and coordination state: agents, agent
message history, tasks, task dependencies, task entity links, task activities,
hypotheses, experiments, evaluations, research activities, hypothesis-
experiment links, and artifacts. Those records carry `project_id`, not
`session_id`. When useful for provenance, project-owned records may also carry
fields such as `created_in_session_id`, `claimed_in_session_id`, or
`completed_in_session_id`, but the session is not their owner.

Sessions own lifecycle and runtime attachment state. Starting Situ creates a
fresh session by default; resuming an existing session must be explicit. There
is no stored "active session" pointer on the workspace; the most-recently-
updated session is derived on demand. Agent and task records describe
coordination and handoffs around the ledger work rather than replacing
hypotheses, experiments, evaluations, activities, artifacts, or events.

## Workspace

The folder/runtime boundary.

A workspace records the repo path where Situ is running and scopes local state,
subscriptions, and sessions. It should not carry the research objective or
experiment context; those belong to projects.

## Project

A research effort inside a workspace.

A project owns the objective and research context for a bundle of sessions. The
objective names what the effort is trying to improve or understand. The
research context describes how progress is judged.

Research context can include commands, tools, dashboards, metrics, eval suites,
logs, cluster jobs, notebooks, or human review criteria. Do not require the
user to reduce this to one command or one metric during onboarding.

A session may have no project when it first starts. Once the setup is known,
the manager or user can create or attach a project. Multiple sessions may attach
to the same project over time. Hypotheses, experiments, evaluations, research
activities, and artifacts created while that session is attached to a project
belong to the project, with optional `created_in_session_id` provenance.

## Session

The main unit of autoresearch work.

A session belongs to one workspace (required `workspace_id` FK) and may attach
to one project (`project_id`, nullable). It owns lifecycle status and runtime
association, not the research ledger or coordination records. Each new `situ
start` creates a new session. `situ resume` is the explicit action for
continuing the same session id. There is no stored "active session" pointer on
the workspace; lookups for "the latest session" sort by `updated_at` on demand.

Agent, task, and research records may point back to the session that created,
claimed, completed, or otherwise observed them. Those fields are provenance and
should not be used as ownership boundaries.

## Hypothesis

A research thread inside a project.

Hypotheses should be lightweight and status-light. A hypothesis can be open,
active, or closed. Whether it is promising, weakened, suspicious, or mostly
supported should be explained through activities rather than status explosion.

Hypotheses are required to belong to a project (`project_id` FK, NOT NULL). If
a session created the hypothesis, store that provenance as
`created_in_session_id`.

## Experiment

One concrete attempt: a change, probe, analysis, or testable intervention.

Experiments should also be status-light: open, active, or closed. Details such
as failure, suspiciousness, reproduction, or interpretation should be expressed
as experiment activities.

Experiments are required to belong to a project (`project_id` FK, NOT NULL). If
a session created the experiment, store that provenance as
`created_in_session_id`.

Do not add `Variant` as a first-class model yet. Use experiment summaries,
activity bodies, artifacts, and links to express baseline + A, baseline + B,
A + C, or partial-C style combinations.

## Evaluation

A lightweight measurement thread.

Evaluations describe how the session checked behavior and what evidence came
back. They are intentionally schema-light and text-heavy. An evaluation may
represent baseline measurement, candidate measurement for an experiment,
reproduction, sanity checking, or a blocked setup attempt.

Evaluations should be status-light: open, active, or closed. Repeated runs,
stdout/stderr, observed signals, interpretations, concerns, and reproduction
notes should be recorded as evaluation activities rather than columns on the
evaluation itself.

Evaluations are required to belong to a project (`project_id` FK, NOT NULL)
and may optionally point at the experiment they measure
(`associated_experiment_id`, nullable). A baseline evaluation usually has no
associated experiment. A candidate or reproduction evaluation usually points
at the experiment it measures. If a session created the evaluation, store that
provenance as `created_in_session_id`.

Before a session treats candidate experiments as comparable, it should establish
at least one baseline evaluation activity with evidence. This is a product rule,
not a requirement that onboarding reduce evaluation to one command or metric.

## HypothesisExperimentLink

A lightweight many-to-many link between hypotheses and experiments.

One experiment may test multiple hypotheses, and one hypothesis may require many
experiments. Keep the first link shape simple: the linked IDs and created time
are enough. Put explanation in hypothesis or experiment activities.

## Activity

The main collaboration primitive.

Activities are timeline entries attached to hypotheses, experiments, or
evaluations. They replace standalone evidence, finding, warning, and decision
models in the first slice.

Activities reach a project through their parent (the hypothesis, experiment,
or evaluation), which is itself project-required. Activity rows do not carry
their own `session_id` column. If a session created the activity, store that
provenance as `created_in_session_id`.

The first slice uses only `comment` as the activity kind. Results, concerns,
interpretations, plans, and decisions are written as comments. Structured
payloads may label those comments for views or agents when useful, but the
human-readable body is the source of truth.

The activity body should remain human-readable. Structured payloads can hold
metrics, eval outputs, artifact IDs, or machine-readable details when useful.
Raw benchmark or command evidence should normally be attached to an evaluation
activity, with experiment activities reserved for what changed, why it was
tried, and how the result affects the experiment.

## Artifact

A receipt produced by the loop.

Artifacts are file-like or bulky outputs that activities reference: raw eval
JSON, logs, diffs, patches, screenshots, traces, samples, or reproduction
bundles. Activities explain what happened; artifacts preserve the thing.

Artifacts always belong to a project (`project_id` FK, NOT NULL) and attach
to a specific entity within that project through a generic association:

```text
project_id              (required)
created_in_session_id   (optional)
associated_entity_kind
associated_entity_id
```

This keeps artifact storage simple while still allowing artifacts to attach to a
project, hypothesis, experiment, evaluation, or activity.

## Event

An internal timestamped record of system/runtime behavior.

Events power debugging and streaming. They should not become the main product
collaboration layer; activities are for that.

Events may be associated with a project, a session, both, or neither:

```text
associated_project_id   (optional)
associated_session_id   (optional)
```

Project-associated events describe changes to project-owned research or
coordination state. Session-associated events describe lifecycle, runtime, or
diagnostic behavior for one execution window. A `session.started` event for an
attached project should carry both associations; a pre-setup runtime event may
carry only `associated_session_id`.

## Deferred Primitives

These remain possible future concepts, but are not part of the first
implementation slice:

- Direction
- Standalone Decision
- Standalone Finding
- Standalone Warning
- Standalone Evidence
- Standalone EvaluationProtocol
- Standalone EvaluationRun
- Report
- Broad health model
