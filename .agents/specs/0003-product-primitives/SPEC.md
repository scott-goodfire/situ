# Product Primitives

Use simple product nouns. For the first slice, keep the domain intentionally
small and let activities carry nuance.

## MVP Hierarchy

```text
Objective
  |-- Hypotheses
  |     `-- HypothesisActivity
  |-- Experiments
  |     `-- ExperimentActivity
  |-- HypothesisExperimentLinks
  |-- Artifacts
  `-- Sessions
        `-- Events
```

## Objective

The durable north star. It defines what the research is trying to improve or
understand.

A first objective needs title/description plus lightweight evaluation context:
how progress is judged, what signals or artifacts matter, and what kinds of
experiments are in scope.

Objectives may carry an optional `associated_session_id` as provenance when
they are created or revised during a session. This is not ownership; objectives
remain durable across sessions.

## Research Context

A plain-language description of how progress is judged.

It can include commands, tools, dashboards, metrics, eval suites, logs, cluster
jobs, notebooks, or human review criteria. Do not require the user to reduce
this to one command or one metric during onboarding.

Keep this as one LLM-friendly field in the first slice. Do not split it into
separate required fields for eval commands, known signals, metric names, and
experiment scope until the product proves those boundaries are stable.

## Session

An internal execution window for a local Almanac process.

Sessions track runtime lifecycle, worker activity, agent message history, and
events. They are useful to the system, but they are not the main product object
the user should organize research around.

## Hypothesis

A research thread under an objective.

Hypotheses should be lightweight and status-light. A hypothesis can be open,
active, or closed. Whether it is promising, weakened, suspicious, or mostly
supported should be explained through activities rather than status explosion.

Hypotheses may carry an optional `associated_session_id` to show which session
introduced or last contextualized them. They should still be considered part of
the objective, not owned by a single session.

## Experiment

One concrete attempt: a change, probe, eval run, analysis, or test.

Experiments should also be status-light: open, active, or closed. Details such
as failure, suspiciousness, reproduction, or interpretation should be expressed
as experiment activities.

Experiments may carry an optional `associated_session_id` for the session that
introduced them. This supports session filtering without making sessions the
main product object.

Do not add `Variant` as a first-class model yet. Use experiment summaries,
activity bodies, artifacts, and links to express baseline + A, baseline + B,
A + C, or partial-C style combinations.

## HypothesisExperimentLink

A lightweight many-to-many link between hypotheses and experiments.

One experiment may test multiple hypotheses, and one hypothesis may require many
experiments. Keep the first link shape simple: the linked IDs and created time
are enough. Put explanation in hypothesis or experiment activities.

## Activity

The main collaboration primitive.

Activities are timeline entries attached to hypotheses or experiments. They
replace standalone evidence, finding, warning, and decision models in the first
slice.

The first slice uses only `comment` as the activity kind. Results, concerns,
interpretations, plans, and decisions are written as comments. Structured
payloads may label those comments for views or agents when useful, but the
human-readable body is the source of truth.

The activity body should remain human-readable. Structured payloads can hold
metrics, eval outputs, artifact IDs, or machine-readable details when useful.

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
- Report
- Broad health model
