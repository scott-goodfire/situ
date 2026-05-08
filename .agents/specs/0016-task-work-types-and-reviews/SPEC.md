# Task Work Types

## Purpose

Situ tasks help humans and agents understand the shape of work, who can claim
it, and which records it produces.

This spec defines task type semantics. It narrows the task coordination
contract from
[0013-agent-task-coordination](../0013-agent-task-coordination/SPEC.md) and the
workflow-state contract from
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md).

## Product Thesis

Autoresearch coordination uses visible work items. A task is the user-visible
work item for planned Manager, Researcher, and Scientist work. The runtime
poller reads statuses, links, and dependencies to derive the next runnable
task.

## Task Work Type

A task exposes a bounded semantic type that tells the runtime and UI how to
route, display, and prompt the work.

Task work types:

- `plan`
- `research`
- `hypothesize`
- `baseline`
- `experiment`
- `interpret`

The type determines the eligible agent lane:

- Manager: `plan`
- Researcher: `research`, `hypothesize`, `interpret`
- Scientist: `baseline`, `experiment`

An implementation may expose type as a single field or as a broad kind plus a
more specific work type. The product contract is that each task has one clear
semantic frame for routing, display, and runtime skill selection.

## Task Status

Task statuses follow
[0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md):

```text
triage
backlog
in_progress
done
canceled
failed
```

Triage is the intake lane. A task in triage needs acceptance, cancellation,
merge, refinement, or routing before normal execution. Accepting a task moves
it to backlog. Canceling a task moves it to canceled. Each status transition
records a `status_updated` activity on the task.

## Critic Review Posture

The Critic operates autonomously: it scans the project for records that need
review in the `triage` or `in_review` status lanes, forms a judgment, and acts
directly via transition tools on the target record.

When the Critic finds a problem, it calls `cancel_<record>` with a comment
that explains. When the Critic finds the record acceptable, it calls
`accept_<record>` or `complete_<record>` with a comment that explains.
Cancellation comments carry the verdict and reasoning. The status transition
plus its comment carry the judgment.

Per-record-kind review methodology lives in runtime skills under
`agent_skills/critic/`. The skills describe what to look for in each record
type.

Manager planning may file follow-up producer-lane tasks (`research`,
`hypothesize`, `experiment`, etc.) when the Critic's cancellation comment
suggests work that should happen next. Follow-up routing is Manager
judgment, not pull derivation from a structured review payload.

## Context Acquisition

The Critic acquires context through explicit tools. The trace should show the
Critic reading the records it uses before taking a transition action.

For experiments, useful context includes the experiment record, experiment
activities, evaluations, measurements, workspace-state observations, patch or
command artifacts, linked hypotheses, and the producing Scientist task.

For hypotheses, useful context includes the hypothesis record, hypothesis
activities, linked or nearby analyses, active hypotheses, linked experiments,
and the producing or associated task.

For analyses, baselines, and evaluations, useful context includes the record
body, related activities, measurements where present, artifacts, linked tasks,
and project objective/research context.

## TUI Shape

Live task surfaces show the task work type when it clarifies the work. Tasks
appear in the standard triage, backlog, in-progress, done, canceled, and
failed lanes. Critic activity appears on target records' timelines as
`status_updated` and `comment` activities.

## Out of Scope

- A standalone Review, ReviewRequest, Verification, Warning, Finding, or
  PullRequest model.
- Human-dependent review states.
- Approval quorums, required reviewers, merge queues, cycles, estimates,
  labels, and team collaboration workflows.

## Review Criteria

- The 6 task work types (`plan`, `research`, `hypothesize`, `baseline`,
  `experiment`, `interpret`) cover producer-lane work.
- The Critic acts through transition tools on target records.
- Critic judgments are visible as `status_updated` and `comment` activities
  on the target record.
- Critic traces show explicit reads before judgment.
