# Pull-Based Workflow State

## Purpose

Situ uses small workflow state machines plus activity timelines to make
multi-agent work inspectable. The product shape is close to an issue tracker:
records enter triage, get accepted or canceled, move through focused work, and
leave an activity trail that explains each transition.

This spec defines workflow states, transition activities, and pull-based
routing for tasks and stateful research records. It narrows the product
primitive contract from
[0003-product-primitives](../0003-product-primitives/SPEC.md) and the activity
contract from
[0010-activities-and-artifacts](../0010-activities-and-artifacts/SPEC.md).

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

Workflow states remain small. Detailed reasons, lineage choices, repair notes,
and result interpretation live in activities and transition comments.

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
in_review
done
canceled
failed
```

State meanings:

- `triage`: the record exists but is not yet admitted as normal project
  context or decision-grade evidence. Pre-creation review lane.
- `accepted`: the record is admitted into the project context and can be read
  by planning, review, and execution agents.
- `active`: the record is currently being worked, measured, or used as the
  focus of a task.
- `in_review`: the producer has finished work and submitted the record for
  Critic review of the evidence. Post-completion review lane.
- `done`: the record reached a resolved, completed, and vetted terminal state
  for the project.
- `canceled`: the record is intentionally excluded from active use. The
  cancellation comment carries the reason.
- `failed`: the record represents attempted work or evidence collection that
  did not produce a usable result.

`in_review` applies to evidence-producing records: **experiments**,
**baselines**, and **evaluations**. The Scientist (or producer) calls
`submit_<record>` when work is finished, moving `active` → `in_review`. The
Critic vets the evidence and calls `complete_<record>` to finalize as `done`,
or `cancel_<record>` to reject.

Records that don't produce post-creation evidence — **analyses** and
**hypotheses** — skip `in_review`. Their `complete_<record>` (or
`resolve_hypothesis`) moves `active` → `done` directly.

Record-specific language appears in activities and UI labels. For example, a
`done` hypothesis can have a recorded resolution of `supported`, `rejected`,
`superseded`, or `inconclusive`; a `done` experiment can have a recorded
lineage decision such as `continue`, `fork`, `reproduce`, or `reject`.

Measurements and artifacts remain evidence records. A baseline, experiment, or
evaluation state expresses whether the evidence around that object is admitted,
active, in review, resolved, canceled, or failed.

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

State transitions create `status_updated` activities. They also create a
separate `comment` when the actor supplies prose explaining the transition.

## Recorded Facts

`recorded` activities carry a structured fact in payload metadata. The payload
uses `record_type` as the discriminator. The body remains human-readable and
summarizes the fact.

Recorded fact types:

- `lineage_decision`
- `hypothesis_resolution`

The set grows only when a fact type needs durable rendering, polling, or
agent-readable behavior. Freeform discussion remains `comment`.

Suspicious or invalid evidence is not a separate structured fact type. When an
agent decides evidence is not trustworthy, it cancels the affected record (or
the parent record) with a comment explaining the reason. The cancellation IS
the verdict; the comment IS the reason.

## Review Posture

The Critic operates autonomously by scanning record statuses: it polls for
records in `triage` (pre-creation review) and `in_review` (post-completion
review of evidence), forms a judgment, and acts directly via transition tools.

The status field IS the queue. `triage` records are awaiting admission into
the project; `in_review` records are awaiting evidence vetting after the
producer finished work.

An active session invokes the Critic whenever the project contains records in
either review lane. Producer passes hand control to the Critic before Manager
planning resumes from the reviewed project state.

Critic review ownership is tracked with lightweight coordination work items.
Each open review work item points at one review-lane record and stores the
current owner workflow, claim time, lease expiry, attempt count, availability
time, and small payload metadata. The work item says which Situ record the
running Critic pass owns; the workflow runner remains the durable execution
boundary for the agent pass.

When the review lane drains, the runtime records a durable continuation claim
for that drained state. Exactly one Manager planning pass resumes from each
distinct drained Critic state.

Repeated Critic passes that leave the assigned record in a review-lane status
are capped. When the cap is reached, the coordination work item is marked
failed and the session records a stalled-Critic failure.

Critic transitions:

- `triage` → `accepted`: `accept_<record>` (admits design/intent)
- `triage` → `canceled`: `cancel_<record>` (rejects pre-run)
- `in_review` → `done`: `complete_<record>` (vets evidence, finalizes)
- `in_review` → `canceled`: `cancel_<record>` (rejects evidence)

When the Critic finds a problem, it calls `cancel_<record>` with a comment
that explains. When the Critic finds the record acceptable, it calls
`accept_<record>` or `complete_<record>` with a comment that explains the
verdict. The status transition plus its comment carry the judgment.

The Critic's per-record-kind methodology lives in the runtime skills under
`agent_skills/critic/`. The skills describe how to review each kind of record
from the review status lanes.

## Pull-Based Routing

Situ coordination is pull-based. The runtime poller reads the current project
state, record statuses, and dependencies, then derives runnable tasks for
agents to claim. Recorded facts describe the world; the poller derives work
from unresolved world state.

Useful derivations include:

- A task in `triage` appears in the intake lane until it is accepted into
  `backlog` or moved to `canceled`.
- A research record in `triage` appears in the intake lane until it is accepted
  or canceled.
- A research record in `accepted` or `active` with stale or missing follow-up
  work can be surfaced for the Manager to triage.

Derived tasks are idempotent. A poller checks for existing open, active, or
completed tasks linked to the same target before creating another task.

## Transition Tools

State transitions are action-shaped at the tool boundary. A transition tool
changes one record's status and records a `status_updated` activity. When the
actor supplies prose, the tool records a separate `comment`.

Per-record transition tools:

- `accept_<record>`: `triage` → `accepted` (Critic)
- `submit_<record>`: `active` → `in_review` (producer; experiments, baselines,
  evaluations only)
- `complete_<record>`: `in_review` → `done` for evidence-producing records;
  `active` → `done` for analyses and hypotheses
- `cancel_<record>`: any non-terminal → `canceled`
- `fail_<record>`: active or in_review → `failed`

Transition tools own workflow status changes. Generic record updates own
non-status edits.

## TUI Shape

The TUI groups tasks by workflow state and exposes triage as an intake lane.
Research records show their status as the primary label:

```text
triage
accepted
active
in_review
done
canceled
failed
```

The activity timeline remains the source of explanation. Cancellation comments
explain why a record was canceled.

## Out of Scope

- A standalone Review, ReviewRequest, Verification, Warning, Finding, or
  PullRequest model.
- A `trust_finding` recorded activity. Suspicious evidence becomes a
  cancellation comment.
- Human-dependent workflow states.
- Approval quorums, required reviewers, merge queues, cycles, estimates,
  labels, and team collaboration workflows.

## Review Criteria

- Workflow-tracked records use small status vocabularies and record transitions
  as `status_updated` activities.
- Freeform prose appears as `comment`; machine-visible facts appear as
  `recorded` activities with `record_type` payload metadata.
- The Critic role acts autonomously through transition tools and comments;
  review work is not represented as a task type.
- Pull-based routing derives tasks from unresolved statuses, dependencies, and
  recorded facts.
- Cancellation comments explain why a record was excluded.
- Measurements and artifacts remain evidence records.
