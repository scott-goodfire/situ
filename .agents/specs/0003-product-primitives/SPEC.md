# Product Primitives

Use simple product nouns. The domain is intentionally small; activities
carry nuance.

## Target Hierarchy

```text
Workspace
  |-- Projects                     (workspace-owned research efforts)
  |     |-- Agents                      (project participants)
  |     |     `-- AgentMessageHistory
  |     |-- Tasks                       (agent work orders)
  |     |     |-- TaskDependencies
  |     |     |-- TaskEntityLinks
  |     |     `-- TaskActivity
  |     |-- Analyses                    (project_id required)
  |     |     `-- AnalysisActivity
  |     |-- Hypotheses                  (project_id required)
  |     |     `-- HypothesisActivity
  |     |-- Baselines                   (project_id required; each may have many evaluations)
  |     |-- Experiments                 (project_id required; each may have many evaluations)
  |     |     `-- ExperimentActivity
  |     |-- Evaluations                 (project_id required; each measures one baseline or experiment)
  |     |     `-- Measurements           (each evaluation may have many measurements)
  |     |-- HypothesisExperimentLinks
  |     |-- Artifacts                   (project_id required)
  |     `-- Events                      (when project-associated)
  `-- Sessions                     (workspace_id required, project_id optional)
        `-- Events                      (when session-associated)
```

The workspace is the folder boundary and owns local Situ state for a repo path.
Projects are research efforts inside a workspace. A project carries the
objective and research context for that effort. Sessions are live autoresearch
runs inside a workspace, and may attach to zero or one project.

Human-facing persisted records should have compact, referenceable IDs. The
current canonical forms are `P<N>` for projects, `S<N>` for sessions, `A<N>`
for analyses, `H<N>` for hypotheses, `B<N>` for baselines, `EX<N>` for
experiments, `EV<N>` for evaluations, `M<N>` for measurements, `ART<N>` for
artifacts, and `T<N>` for tasks. These IDs should be short enough for terminal
rows, activity text, agent prompts, and user steering. This is a hard
local-state cutover: older long-form IDs such as `project_...`,
`session_0001`, `hyp_...`, `exp_...`, and `eval_...`, plus their analysis,
baseline, measurement, artifact, and task variants, are not part of the
supported product model.

Workspace IDs are the exception. A workspace ID may remain an internal,
path-derived stable identifier because the workspace is the repo-path boundary,
not the thing humans normally cite during a run. Activity, event,
message-history, dependency, and link row IDs may remain storage-local or
compound implementation identifiers when their parent record carries the
human-facing reference.

For the current product slice, the default `situ tui [workspace]` start flow is
one fresh project for one fresh session. The project is created or resolved
first, then the session is created attached to that project. A projectless
session remains a valid low-level state while setup or triage is incomplete,
but it is not the default user-facing start behavior.

Projects own the durable research records and coordination state: agents, agent
message history, tasks, task dependencies, task entity links, task activities,
analyses, hypotheses, baselines, experiments, evaluations, measurements,
research activities, hypothesis-experiment links, and artifacts. Those records
carry `project_id`, not `session_id`. When useful for provenance,
project-owned records may also carry fields such as `created_in_session_id`,
`claimed_in_session_id`, or `completed_in_session_id`, but the session is not
their owner.

Sessions own lifecycle and runtime attachment state. Starting Situ creates a
fresh session by default; resuming an existing session must be explicit. There
is no stored "active session" pointer on the workspace; the most-recently-
updated session is derived on demand. Agent and task records describe
coordination and handoffs around the research-record work.

Workflow-tracked records use the state machines defined in
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md).
Tasks carry coordination state. Analyses, hypotheses, baselines, experiments,
and evaluations carry research-record state. Activities record status
transitions, structured facts, and comments.

## Workspace

The folder/runtime boundary.

A workspace records the repo path where Situ is running and scopes local state,
subscriptions, and sessions. Projects carry the research objective and
experiment context.

## Project

A research effort inside a workspace.

A project owns the objective and research context for a bundle of sessions. The
objective names what the effort is trying to improve or understand. The
research context describes how progress is judged.

Research context can include commands, tools, dashboards, metrics, eval suites,
logs, cluster jobs, notebooks, or review criteria. Onboarding preserves broad
research context as plaintext when the project cannot be reduced to one command
or one metric.

The default start flow creates a new project for a new session and attaches the
session immediately. Resuming an existing session continues that same session
and therefore the same project. Analyses, hypotheses, baselines, experiments,
evaluations, measurements, research activities, and artifacts created while
that session is attached to a project belong to the project, with optional
`created_in_session_id` provenance.

## Session

The main unit of autoresearch work.

A session belongs to one workspace (required `workspace_id` FK) and may attach
to one project (`project_id`, nullable). It owns lifecycle status and runtime
association. Each new default
`situ tui [workspace]` start creates a new project and a new attached session.
`situ tui --resume <session-id>` is the explicit action for continuing the same
session id. There is no stored "active session" pointer on the workspace;
lookups for "the latest session" sort by `updated_at` on demand.

Agent, task, and research records may point back to the session that created,
claimed, completed, or otherwise observed them. Those fields are provenance.

## Analysis

Durable project understanding before, between, and around hypotheses.

Analyses capture what the agent or user has learned about the codebase, domain,
prior art, constraints, opportunities, or open questions. Analysis records can
hold broad understanding before it becomes testable hypothesis material.
Discovery and synthesis tasks produce analyses; manager and scientist passes
read them; testable improvement directions become hypotheses.

Analyses use the research-record state machine. A triaged analysis is intake
context. An accepted analysis is normal project context. An active analysis is
being refined or used as the focus of work. A done analysis is resolved enough
for the project. Canceled or failed analyses remain visible with activity
context. If one analysis supersedes another, link it with
`supersedes_analysis_id` and explain the relationship in an analysis activity.

Analyses are required to belong to a project (`project_id` FK, NOT NULL). If a
session created the analysis, store that provenance as `created_in_session_id`.
If an agent created it, store `created_by_agent_id` when available.

## Hypothesis

A research thread inside a project.

Hypotheses use the research-record state machine. A triaged hypothesis is a
claim that needs acceptance, review, refinement, or cancellation before it
guides empirical work. An accepted hypothesis is usable project context. An
active hypothesis is being tested or refined. A done hypothesis has a recorded
resolution.

Hypothesis resolution is a `recorded` activity with
`record_type: hypothesis_resolution`. Supported, rejected, superseded, and
inconclusive are resolution values on that recorded fact. `supported` means
supported enough for this project's next decision; it does not claim general
truth. `superseded` names the replacement hypothesis when there is one.
Evidence such as linked experiments, evaluations, measurements, artifacts, or
analyses should be cited in the activity payload or body.

Hypotheses are required to belong to a project (`project_id` FK, NOT NULL). If
a session created the hypothesis, store that provenance as
`created_in_session_id`.

## Experiment

One concrete attempt: a change, probe, analysis, or testable intervention.
In the autoresearch loop, an experiment is also the PR-shaped candidate: the
applied version of a hypothesis or idea whose workspace state, evaluation
evidence, and review trail can be inspected together.

When Situ is running lineage-aware autoresearch, an experiment may also record
which prior candidate or base commit it builds on, the durable candidate commit
it produced, and the research thread it belongs to. That lineage context stays
lightweight and experiment-shaped. Separate Variant, Branch, Promotion, or
Champion models are out of scope. See
[0015-experiment-lineage-portfolio-search/SPEC.md](../0015-experiment-lineage-portfolio-search/SPEC.md).

Experiments use the research-record state machine. A triaged experiment is a
candidate idea or produced candidate that needs acceptance, review, refinement,
or cancellation. An accepted experiment is usable project context or a valid
portfolio candidate. An active experiment is being prepared, executed,
measured, or reviewed. A done experiment has enough recorded evidence and
decision context for the project. Canceled and failed experiments remain
inspectable with activities and artifacts.

Experiments are required to belong to a project (`project_id` FK, NOT NULL). If
a session created the experiment, store that provenance as
`created_in_session_id`.

An experiment may have many evaluations. Each evaluation is a distinct check
for that candidate, such as a primary benchmark, reproduction track, latency
smoke, or qualitative review pass. Repeated runs of the same candidate check are
measurements under one evaluation unless the check itself changes enough to
deserve a separate measurement thread.

After candidate evaluation evidence is recorded, a Critic may review the
experiment as a whole. That review attaches to the experiment as a
`recorded` activity with `record_type: review_result`, payload metadata that can
cite the reviewed evaluations and measurements, and a human-readable body.

Do not add `Variant` as a first-class model yet. Use experiment summaries,
activity bodies, artifacts, and links to express baseline + A, baseline + B,
A + C, or partial-C style combinations.

## Baseline

A project-level reference condition.

A baseline is the control or reference state that candidate experiments compare
against. It is the thing being measured, not a specific command execution and
not the measurement result itself. The normal baseline is the current behavior
of the researched workspace before autonomous candidate changes begin, but a
project may record more than one baseline over time when the comparison anchor
meaningfully changes.

Baselines use the research-record state machine. A triaged baseline is proposed
comparison context. An accepted baseline is eligible for comparison. An active
baseline is being measured or refined. A done baseline has enough evidence for
the project's comparison needs. Noisy, incomplete, dirty, suspicious, or
accepted-for-comparison nuance is carried in measurements and activities.

Baselines are required to belong to a project (`project_id` FK, NOT NULL). If a
session created the baseline, store that provenance as
`created_in_session_id`.

A baseline may have many evaluations. Each evaluation is a distinct check
against the reference condition, such as dev accuracy, held-out accuracy,
latency smoke, unit tests, or qualitative review. Repeated runs of the same baseline
check are measurements under one evaluation unless the check itself changes
enough to deserve a separate measurement thread.

Before a session treats candidate experiments as comparable, it should establish
at least one baseline with at least one evaluation and measurement carrying
usable evidence. This is a product rule, not a requirement that onboarding
reduce evaluation to one command or one metric.

## Evaluation

A lightweight measurement thread or check.

Evaluations describe what check is being run against a measured subject. The
measured subject is exactly one baseline or one experiment. Evaluation is not a
synonym for a single command run; repeated command runs and their outputs are
measurements under the evaluation.

Evaluations use the research-record state machine. A triaged evaluation is a
proposed measurement thread. An accepted evaluation is eligible for project
measurement. An active evaluation is being run, reproduced, or interpreted. A
done evaluation has sufficient measurements or a recorded reason that the
thread is complete. Repeated runs, stdout/stderr, observed signals,
interpretations, trust findings, and reproduction notes live as measurements
and activities under the evaluation.

Evaluations are required to belong to a project (`project_id` FK, NOT NULL)
and must point at exactly one measured subject:

```text
associated_baseline_id    (nullable FK -> baselines)
associated_experiment_id  (nullable FK -> experiments)
```

Exactly one of those fields should be present. A baseline evaluation points at a
baseline. A candidate, reproduction, or sanity evaluation for a candidate points
at the experiment it measures. If a session created the evaluation, store that
provenance as `created_in_session_id`.

Cardinality is intentionally simple: one baseline or experiment can have many
evaluations, and one evaluation can have many measurements. Create a new
evaluation when the check or measurement thread changes; add a measurement when
the same check is rerun or observed again.

Evaluation titles and summaries may remain text-rich because measurement
instructions, commands, expected outputs, dashboards, and review criteria vary
by project. The subject relationship must be structured because UI, agent
context, task links, and comparability checks rely on it.

## Measurement

One concrete observed result under an evaluation.

A measurement records what happened when the evaluation was actually run or
observed. It can include command text, workspace state, raw output summaries,
metric bundles, pass/fail checks, trust-finding metadata, and artifact
references.
This is the model-level home for evidence that came back from a baseline or
candidate check.

Measurements are project-owned through their evaluation. If a session created a
measurement, store that provenance as `created_in_session_id`.

Measurements preserve repeated observations, variance, failed attempts, and
reproduction evidence under the same evaluation. Measurements are the
source of truth; any summary fields on baselines, experiments, or
evaluations are derived from measurements or explained in activities.

Measurement bodies should remain human-readable. Structured payload metadata can
hold machine-readable details such as:

```text
command
workspace_state
metrics
raw_output_summary
artifact_ids
trust_findings
comparison_baseline_id
comparison_measurement_id
comparison_metric_deltas
```

Comparisons are derived from measurements; they are not the baseline record
itself. A comparable result should pair candidate measurement evidence with
baseline measurement evidence from the same or clearly compatible evaluation
thread, using matching metric keys and documenting any selected baseline
measurement or aggregate in the measurement payload or an activity. If multiple
baseline measurements exist, the comparison should say whether it used the
latest accepted measurement, a selected measurement, or an aggregate summary.

Metric bundles should stay inside the measurement payload until the product has
a stable cross-project need for querying or enforcing individual metric fields.
Metric observations inside the payload should use a typed shape with one value
per metric key, optional unit/direction/notes metadata, and room for additional
measurement context. This keeps metric output structured enough to compare while
avoiding a separate metric lifecycle.

Do not add a first-class `Metric` table before the current loop proves which
metric shape is stable across different projects. Do not add a first-class
`Comparison` table before the current loop proves that comparisons need their
own lifecycle beyond derived summaries and activities.

## HypothesisExperimentLink

A lightweight many-to-many link between hypotheses and experiments.

One experiment may test multiple hypotheses, and one hypothesis may require many
experiments. Keep the first link shape simple: the linked IDs and created time
are enough. Put explanation in hypothesis or experiment activities.

## Activity

The main collaboration primitive.

Activities are timeline entries attached to analyses, hypotheses, experiments,
evaluations, measurements, tasks, or other inspectable research records when
useful. Findings, warnings, and decisions are recorded facts on the natural
target record.

Activities reach a project through their parent research record or associated
entity, following the ownership rules for that entity. If a session created the
activity, store that provenance as `created_in_session_id`.

Activity kinds follow
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md):
`created`, `updated`, `status_updated`, `recorded`, and `comment`.
Measurement evidence should be recorded as measurements, with human-readable
result text and structured payload metadata. Results, trust findings,
interpretations, plans, and decisions live in human-readable bodies, with
structured payloads available for views or agents when useful.

The activity body should remain human-readable. Structured payloads can hold
artifact IDs or machine-readable details when useful. Raw benchmark or command
evidence should normally be attached to a measurement, with experiment
activities reserved for what changed, why it was tried, and how the result
affects the experiment. Analysis activities should explain refinements, caveats,
source notes, or why an analysis is superseded. Hypotheses, evaluations, and
measurements remain the natural records for testable claims, measurement
threads, and observed evidence.

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
project, hypothesis, baseline, experiment, evaluation, measurement, or activity.

## Event

An internal timestamped record of system/runtime behavior.

Events power debugging and streaming. Activities are the product collaboration
timeline.

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

## Out of Scope

The primitive set excludes:

- Direction
- Standalone Decision
- Standalone Finding
- Standalone Warning
- Standalone Evidence
- Standalone EvaluationProtocol
- Standalone EvaluationRun
- First-class Metric table
- Report
- Broad health model
