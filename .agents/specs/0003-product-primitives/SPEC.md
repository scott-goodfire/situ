# Product Primitives

Use simple product nouns. For the first slice, keep the domain intentionally
small and let activities carry nuance.

## Current Hierarchy

```text
Project
  `-- Sessions
        |-- Objective text
        |-- Research context
        |-- Hypotheses
        |     `-- HypothesisActivity
        |-- Experiments
        |     `-- ExperimentActivity
        |-- Evaluations
        |     `-- EvaluationActivity
        |-- HypothesisExperimentLinks
        |-- Artifacts
        `-- Events
```

The project is the workspace boundary. The session is the primary product
object. Starting Almanac creates a fresh session by default; resuming an
existing session must be explicit.

## Objective

The session north star. It defines what this session is trying to improve or
understand.

A first objective needs title/description plus lightweight research context:
how progress is judged, what signals or artifacts matter, and what kinds of
experiments are in scope.

Objectives are owned by sessions in the first slice. A project may have many
sessions with similar objectives, but each session owns its own objective text
and ledger.

## Research Context

A plain-language description of how progress is judged.

It can include commands, tools, dashboards, metrics, eval suites, logs, cluster
jobs, notebooks, or human review criteria. Do not require the user to reduce
this to one command or one metric during onboarding.

Keep this as one LLM-friendly field in the first slice. Do not split it into
separate required fields for eval commands, known signals, metric names, and
experiment scope until the product proves those boundaries are stable.

## Session

The main unit of autoresearch work.

A session has an objective, research context, lifecycle status, agent message
history, hypotheses, experiments, evaluations, activities, artifacts, and
events. Each new `almanac start` creates a new session. `almanac resume` is the
explicit action for continuing the same session id.

## Hypothesis

A research thread inside a session.

Hypotheses should be lightweight and status-light. A hypothesis can be open,
active, or closed. Whether it is promising, weakened, suspicious, or mostly
supported should be explained through activities rather than status explosion.

Hypotheses are owned by the session that created them. Prior-session
hypotheses may be used as reference material later, but they should not appear
as current-session state unless explicitly copied or summarized into the new
session.

## Experiment

One concrete attempt: a change, probe, analysis, or testable intervention.

Experiments should also be status-light: open, active, or closed. Details such
as failure, suspiciousness, reproduction, or interpretation should be expressed
as experiment activities.

Experiments are owned by a session.

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

Evaluations are owned by a session and may optionally point at the experiment
they measure. A baseline evaluation usually has no associated experiment. A
candidate or reproduction evaluation usually points at the experiment it
measures.

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

Artifacts attach through a generic association:

```text
associated_entity_kind
associated_entity_id
associated_session_id?
```

This keeps artifact storage simple while still allowing artifacts to attach to a
session, objective, hypothesis, experiment, or activity.

## Event

An internal timestamped record of system/runtime behavior.

Events power debugging and session streaming. They should not become the main
product collaboration layer; activities are for that.

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
