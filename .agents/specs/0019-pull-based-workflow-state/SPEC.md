# Pull-Based Workflow State

## Purpose

Situ uses small workflow state machines plus activity timelines to make
multi-agent work inspectable. The product shape is close to an issue tracker:
records enter triage, get accepted or canceled, move through focused work, and
leave an activity trail that explains each transition.

This spec defines workflow states, transition activities, and pull-based
routing for tasks and stateful research records. It narrows the product
primitive contract from
[0003-product-primitives](../0003-product-primitives/SPEC.md), the activity
contract from
[0010-activities-and-artifacts](../0010-activities-and-artifacts/SPEC.md), and
the task/review contract from
[0016-task-work-types-and-reviews](../0016-task-work-types-and-reviews/SPEC.md).

## Workflow Posture

Workflow state belongs on records that represent work or durable research
objects:

- Tasks
- Analyses
- Hypotheses
- Baselines
- Experiments
- Evaluations

Activities, measurements, artifacts, links, events, and agent message history
are append-only evidence, receipts, relationships, traces, or transcript
records. Their interpretation appears through the workflow state and activities
of the records they attach to.

Workflow states remain small. Detailed reasons, review findings, trust flags,
lineage choices, repair notes, and result interpretation live in activities.

## Task State Machine

Tasks use an issue-style coordination state machine:

```text
triage
backlog
in_progress
done
canceled
failed
```

State meanings:

- `triage`: the task is an intake item that needs routing, acceptance, merging,
  cancellation, or refinement before normal execution.
- `backlog`: the task is accepted and eligible for normal polling when its
  dependencies and `available_at` allow it.
- `in_progress`: an agent has claimed the task.
- `done`: the task completed successfully enough for its assignment.
- `canceled`: the task is intentionally out of the runnable queue.
- `failed`: the task was attempted and blocked by an error, missing evidence,
  or unusable execution result.

Dependencies and `available_at` refine runnability within these states. A task
can be accepted but not runnable when dependencies are incomplete or its
availability time has not arrived.

## Research Record State Machine

Stateful research records use a compact research-object state machine:

```text
triage
accepted
active
done
canceled
failed
```

State meanings:

- `triage`: the record exists but is not yet admitted as normal project
  context or decision-grade evidence.
- `accepted`: the record is admitted into the project context and can be read
  by planning, review, and execution agents.
- `active`: the record is currently being worked, measured, reviewed, or used
  as the focus of a task.
- `done`: the record reached a resolved, completed, or usable terminal state
  for the project.
- `canceled`: the record is intentionally excluded from active use.
- `failed`: the record represents attempted work or evidence collection that
  did not produce a usable result.

Record-specific language appears in activities and UI labels. For example, a
`done` hypothesis can have a recorded resolution of `supported`,
`rejected`, `superseded`, or `inconclusive`; a `done` experiment can have a
recorded lineage decision such as `continue`, `fork`, `reproduce`,
`abandon`, or `reject`.

Measurements and artifacts remain evidence records. A baseline, experiment, or
evaluation state expresses whether the evidence around that object is admitted,
active, resolved, canceled, or failed.

## Activity Kinds

Activities use a small visible kind vocabulary:

```text
created
updated
status_updated
recorded
comment
```

Kind meanings:

- `created`: an inspectable record was created.
- `updated`: non-status fields or relationships changed.
- `status_updated`: a workflow status changed.
- `recorded`: a structured project fact was recorded.
- `comment`: a human or agent wrote freeform discussion, explanation,
  handoff, or steering.

`updated` covers non-lifecycle changes such as title, priority, assignee,
summary, payload, or relationship edits. `status_updated` covers state-machine
transitions and carries both the prior and new status in its payload.

State transitions create `status_updated` activities. They may also create a
separate `comment` when an actor supplies additional prose.

## Recorded Facts

`recorded` activities carry a structured fact in payload metadata. The payload
uses `record_type` as the discriminator. The body remains human-readable and
summarizes the fact.

Common recorded fact types include:

- `review_result`
- `trust_finding`
- `lineage_decision`
- `hypothesis_resolution`
- `measurement_interpretation`
- `artifact_note`

The set grows only when a fact type needs durable rendering, polling, or
agent-readable behavior. Freeform discussion remains `comment`.

Review results use autonomous decisions:

```text
accepted
changes_requested
rejected
inconclusive
```

A review result describes the evidence and findings. Findings carry stable
codes, summaries, severity or blocking metadata when useful, and links to
evidence records or artifacts. Routing is derived from these facts by the
poller.

Trust findings use the same recorded-fact shape. They make suspicious or
invalid evidence visible without introducing a separate warning model.

## Pull-Based Routing

Situ coordination is pull-based. The runtime poller reads the current project
state, record statuses, dependencies, and recorded facts, then creates or
claims runnable tasks. Recorded facts describe the world; the poller derives
work from unresolved world state.

Useful derivations include:

- A task in `triage` appears in the intake lane until it is accepted into
  `backlog` or moved to `canceled`.
- A research record in `triage` appears in the intake lane until it is accepted
  or canceled.
- An accepted or active experiment with completed measurement evidence and no
  later review result is eligible for a `review_experiment` task.
- A hypothesis in triage or accepted state can be routed through a
  `review_hypothesis` task when the project needs Critic judgment before
  empirical work.
- A review result with `changes_requested` and unresolved blocking findings is
  eligible for a focused producer-lane task that addresses the findings.
- A review result with `inconclusive` and unresolved missing-evidence findings
  is eligible for evidence-gathering or interpretation work.
- A review result with `rejected` excludes the target from decision-grade
  planning unless a later activity or task addresses the rejection.
- A review result with `accepted` makes the target eligible as normal project
  context for later planning and execution.

Derived tasks are idempotent. A poller checks for existing open, active, or
completed tasks linked to the same unresolved activity before creating another
task.

## Review Flow

Review is task-shaped and pull-derived.

```text
target record reaches a reviewable state
  -> poller creates or exposes a review task
  -> Critic claims the review task
  -> Critic reads the task, target record, activities, evidence, and artifacts
  -> Critic records a `review_result` on the target
  -> Critic marks the review task done, canceled, or failed
  -> poller derives follow-up work from the target status and recorded findings
```

The review task is the visible work item. The target-owned `review_result`
activity is the durable judgment. The reviewed record's status may change as a
separate `status_updated` activity when the judgment admits, resolves, rejects,
or blocks the record.

## Transition Tools

State transitions are action-shaped at the tool boundary. A transition tool
changes one record's status and records a `status_updated` activity. When the
actor supplies prose, the tool records a separate `comment`.

Record-specific tools may use names such as `accept_analysis`,
`cancel_experiment`, `complete_task`, or `fail_evaluation` when explicit names
make agent behavior clearer. Generic record updates do not silently encode
workflow transitions.

## TUI Shape

The TUI groups tasks by workflow state and exposes triage as an intake lane.
Research records can show compact derived labels from their status and latest
recorded facts, such as:

```text
triage
accepted
active
changes requested
inconclusive
rejected
done
canceled
failed
```

The labels are projections of record status plus recorded facts. The activity
timeline remains the source of explanation.

## Out of Scope

- A standalone Review, ReviewRequest, Verification, Warning, Finding, or
  PullRequest model.
- Human-dependent workflow states.
- Prescriptive next-action fields on review results.
- Approval quorums, required reviewers, merge queues, cycles, estimates,
  labels, and team collaboration workflows.
- Applying candidate patches to the user's selected checkout as an automatic
  side effect of review acceptance.

## Review Criteria

- Workflow-tracked records use small status vocabularies and record transitions
  as `status_updated` activities.
- Freeform prose appears as `comment`; machine-visible facts appear as
  `recorded` activities with `record_type` payload metadata.
- Review results describe decisions and findings without prescribing the next
  task.
- Pull-based routing derives tasks from unresolved statuses, dependencies, and
  recorded facts.
- Review tasks and follow-up tasks link to the target records and recorded
  facts they review or address.
- Measurements and artifacts remain evidence records, with trust and review
  interpretation attached through recorded activities on the natural parent
  record.
