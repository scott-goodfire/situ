# Activities And Artifacts

## Purpose

Situ does not reduce autoresearch output to one best metric. Autoresearch
often learns through many experiments whose value appears in patterns,
combinations, failures, and suspicious results.

This spec defines the minimal model for activities, measurement evidence, and
artifacts. Workflow state and pull-based routing are defined in
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md).

## Activity

An activity is a timestamped, human-readable entry attached to a hypothesis, an
experiment, an evaluation, a measurement, or another inspectable research record
when useful.

It can describe:

- A comment
- A status update
- A plan
- A result
- A decision
- An interpretation
- A link to an artifact

Activity shape:

```text
id
target_id        (NOT NULL, per activity table or associated entity fields)
created_in_session_id?
actor
kind
body
payload_json
created_at
```

Activities are project-owned through their parent research record. The session
that created an activity can be stored as optional `created_in_session_id`
provenance.

The body should be useful to humans. Activity kinds are `created`, `updated`,
`status_updated`, `recorded`, and `comment`. The payload carries structured
details for agents and views. `recorded` activities use `record_type` as their
payload discriminator.

## Measurements And Results

A measurement is one concrete observed result under an evaluation. It is the
model-level home for command output, workspace-state context, metric bundles,
artifact references, and failures.

Measurements can include scalar metrics, pass/fail checks, slice-level outputs,
latency/cost, logs, artifact references, or failures. Do not force every
measurement into a single numeric metric.

When a measurement comes from a mutable workspace, it should carry or reference
the workspace state that made it interpretable: eval command, branch, commit,
dirty state, changed paths, and coarse changed-path categories.

Experiment activities can summarize what a measurement means for the attempted
change, but repeated benchmark runs, raw stdout/stderr, and reproduction notes
belong on the measurement trail. Evaluation result activities are the
storage shape for measurements; a rigid metric table is out of scope until
the measurement concept is explicit enough to need its own query surface.

## Suspicious Or Invalid Evidence

When evidence looks suspicious or invalid, the agent that notices the problem
cancels the affected record (or its parent) with a comment that explains.
The cancellation IS the verdict; the comment IS the reason. There is no
separate structured "trust finding" activity type.

Examples of cancellation comments:

- `Expected signal "score" was missing from the eval output.`
- `Result shape changed from baseline; not comparable.`
- `Eval failed before producing metrics.`
- `Large score improvement is suspicious because eval scope changed.`
- `Candidate includes dependency changes; environment comparability is unclear.`

## Interpretations

Interpretations and lightweight findings are written as `recorded` activities
when they need structured payloads and as `comment` activities when they are
freeform discussion.

Examples:

- `A improved over baseline, but only on the easy slice.`
- `A+C looks promising; C explains most of the observed lift.`
- `The large improvement in EX4 is suspicious because eval scope changed.`

## Critic Reviews

The Critic role acts directly through transition tools on the target record.
When the Critic decides a record is not trustworthy, it calls
`cancel_<record>` with a comment that explains. When the Critic decides the
record is acceptable, it calls `accept_<record>` or `complete_<record>` with a
comment.

The transition's `status_updated` activity plus its accompanying `comment`
carry the judgment. Raw command output and repeated runs remain on
measurements.

## Evaluations

An evaluation is the lightweight container for measurement evidence. Baseline,
candidate, reproduction, sanity, and blocked setup evidence belong in
evaluation/measurement records.

Evaluation shape:

```text
id
project_id                 (NOT NULL, FK -> projects)
created_in_session_id?
title
summary
status
associated_baseline_id?
associated_experiment_id?
created_at
updated_at
```

Exactly one measured subject should be associated: either
`associated_baseline_id` or `associated_experiment_id`. Do not infer baseline
meaning from a missing experiment association.

Baseline and experiment records may each have many evaluations. Each evaluation
may have many measurements. Use separate evaluations for distinct checks, such
as a primary benchmark, reproduction track, latency smoke, or qualitative
review.

Measurement shape:

```text
id
evaluation_id              (NOT NULL, FK -> evaluations)
created_in_session_id?
actor
body
payload_json
created_at
```

Multiple runs of the same evaluation should normally be multiple measurements
under one evaluation. Create another evaluation only when the measurement thread
itself changes enough that it deserves a separate card, such as a dedicated
reproduction track.

Baseline measurement should be represented as an evaluation associated with a
baseline. Candidate and reproduction measurements should usually link to the
experiment they measure.

Baseline review carries associated baseline evaluations to a reviewed terminal
state. Submitting a baseline submits active baseline-associated evaluations for
review. Completing a baseline completes active or in-review evaluations
associated with that baseline, leaving the accepted baseline evidence with no
open evaluation records.

Comparisons should be derived from compatible measurements, not stored as metric
values on the baseline itself. A candidate measurement may cite the baseline
measurement or aggregate it was compared against in `payload_json`, along with
metric deltas or a human-readable comparison summary. When multiple baseline
measurements exist, the payload or nearby activity should make the selection or
aggregation rule visible.

Metric observations in `payload_json` should use a typed object shape under
stable metric keys, such as `metrics.score.value`, with optional unit,
direction, and notes metadata. Keep metric definitions inside the measurement
payload until they need their own query surface or lifecycle.

## Artifacts

Artifacts are receipts that projects, sessions, analyses, hypotheses,
baselines, experiments, evaluations, measurements, or activities can reference.

They can include:

- Raw eval JSON
- Logs
- Diffs
- Patches
- Git status snapshots
- Screenshots
- Trace exports
- Dataset slices
- Generated samples
- Reproduction bundles

Activities explain what happened. Artifacts preserve the thing that can be
inspected later.

Command-backed work should create receipt artifacts automatically when Situ can
observe the command. A command receipt should preserve the command, working
directory, exit code, output summary or log, best-effort metric hints, runtime
artifact paths, and relevant git state. The measurement body remains the
human-readable interpretation; the receipt is the durable raw evidence.
Concurrent command-backed work preserves one receipt artifact per observed
command without artifact ID collisions or dropped receipts.

Code-changing experiments should also create patch artifacts automatically when
they produce a candidate commit. The patch artifact is a handoff receipt for
humans and later agents: it points at the diff from base state to candidate
state without applying it to the user's selected checkout. Web diff inspection
reads and renders the captured patch artifact content.

Artifact shape:

```text
id
project_id              (NOT NULL, FK -> projects)
created_in_session_id?
associated_entity_kind
associated_entity_id
kind
title
path
media_type?
size_bytes?
created_at
```

Artifact IDs should use the compact `ART<N>` form when the harness creates them.
Artifacts may still attach to projects, hypotheses, baselines, experiments,
evaluations, measurements, or activities through the generic association
fields.

Artifacts always belong to a project. Use the generic associated entity
fields. This keeps the record understandable without forcing Situ to
predict every artifact attachment target.

Persisted artifact paths are relative to Situ's project state directory.
When an agent supplies a readable path outside project state, Situ copies the
file into the project artifact store and records the relative materialized
path.

Structured artifact metadata lives in the artifact file itself or in the
nearby activity payload. A separate artifact metadata table is out of
scope.

## Product Rule

Keep the activity model small and LLM-friendly. A full research knowledge
graph, direction board, variant model, and specialized finding/warning
tables are out of scope.
