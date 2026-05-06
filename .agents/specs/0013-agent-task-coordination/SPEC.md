# Agent Task Coordination

Situ should make agent coordination visible as first-class project state.
Tasks are project-scoped work orders that help agents plan, claim, execute,
and explain focused work across one or more sessions. They can overlap with
familiar issue-tracker language, but their primary job is to coordinate
autoresearch work across the agents attached to a project.

## Intent

The current ledger records durable research outputs: hypotheses, baselines,
experiments, evaluations, measurements, activities, artifacts, and events.
Coordination records show the handoff layer: which project agent decided what
should happen next, what focused work is waiting, what is currently claimed,
and what output a finished work item produced.

Tasks fill that gap without replacing the research ledger. A completed
hypothesize task may produce several hypothesis records. A completed baseline
or experiment task may produce a baseline or experiment, evaluations,
measurements, comments, and artifacts. The task explains the assignment and
completion summary; the produced records remain the inspectable research state.

## Agents

Agents are durable project participants. The first slice uses two agent kinds:

- `manager` plans and files tasks.
- `scientist` claims focused work and produces research ledger output.

Additional kinds such as reviewer or specialist scientists can be added later
without changing the task model. A task's eligible claimant is derived from
its kind rather than stored as a separate assignee kind.

## Tasks

A task belongs to exactly one project. It has a title, content, kind, status,
priority, source, optional parent task, optional assignee agent, optional
kind-specific payload, and optional completion summary. Session provenance is
captured with explicit fields such as `created_in_session_id`,
`claimed_in_session_id`, and `completed_in_session_id`; those fields do not
make the session the owner of the task.

Task kinds should stay bounded and product-specific:

- `plan` for manager planning passes
- `baseline` for establishing measurement context
- `hypothesize` for creating or refining hypotheses
- `experiment` for focused candidate work
- `interpret` for summarizing evidence and implications
- `review` for checking or challenging existing work

Task statuses describe the coordination lifecycle:

- `backlog`
- `in_progress`
- `done`
- `abandoned`
- `failed`

Tasks may depend on other tasks through explicit dependency links. A task may
link to produced or referenced ledger entities through explicit entity links.
These links are what let the TUI answer "what did this task create?" without
guessing from timestamps.

## Task Activity

Task activities are the coordination timeline for a task. They use the same
plain-language activity posture as the rest of Situ: a human-readable body
with optional structured payload for view or agent use.

Task activities can record planning notes, claim notes, user steering,
failure explanations, or completion context. Research evidence should still
be recorded on the natural research ledger records and measurements rather than
hidden inside task activity.

## Wakeup Model

The first manager wakeup mechanism should be task-shaped:

```text
session starts
  -> enqueue a `plan` task
manager claims `plan`
  -> reads project, session, and task state
  -> files scientist tasks
scientist claims runnable work
  -> runs focused work
  -> writes ledger outputs
  -> marks task done or failed
completion
  -> enqueue next `plan` task when more planning is useful
```

This keeps planning and execution visible through the same durable task
surface. If a session has not been attached to a project yet, it can still
emit session-associated setup events, but project coordination records should
start once the project exists. DBOS should still wrap runnable Pydantic AI
agents; Situ should not add a separate workflow engine unless task-shaped
agent/tool execution stops being enough.

The runtime should treat Manager and Scientist as logically always-available
workers. A Manager pass is triggered by session start, Scientist task
completion, user steering, or lack of runnable Scientist work. A Scientist pass
is triggered by a runnable Scientist task. Each LLM pass should stay focused:
the Manager handles one planning task, and the Scientist handles one claimed
work task.

Baseline completion must not close the session by itself. The Manager should be
prompted to keep planning after a Scientist task completes. A single Manager
pass that creates no runnable next work is not enough to stop the loop; the
runtime may close only after a small no-progress guardrail such as three
consecutive planning cycles with no runnable Scientist task, after the
experiment budget is reached, after user stop, or after a fatal failure.

Project/session close is an explicit tool-mediated handshake, not a normal
project update. A Manager that wants to end a project before the experiment
budget is exhausted should first call a close-request tool. The tool returns a
short-lived confirmation code and an agent-readable warning to try to keep
going unless the Manager is confident no useful next work exists. Only a
second close-confirmation tool call with that code, during the same active
planning task, may mark the project closed. Direct project updates must not be
able to bypass this handshake. Once a project is confirmed closed, the runtime
should close the active session immediately instead of burning additional
planning passes.

## TUI Shape

The TUI should be able to show a compact board grouped by task status:
backlog, in progress, done, failed, and abandoned. Task cards should show
kind, priority, title, assignee when claimed, dependency state, recent task
activity, and linked research outputs when present.

The task board should complement the hypothesis and experiment views. It
answers "what work is happening?" while the research ledger answers "what did
we learn?"

## Deferred

- Parallel scientists
- External human assignees as first-class participants
- Cycles, sprints, estimates, labels, and broad issue-tracker workflows
- A dedicated reviewer agent kind
- Complex DBOS workflow orchestration around the full session loop

## Review Criteria

- Tasks are project-scoped and visible through the same collection/event
  pipeline as the rest of the ledger.
- Agents are durable project records, not ad hoc names on task rows.
- Session references on coordination records are provenance fields, not owners.
- Task claims are atomic enough to prevent double-claiming.
- Dependencies are explicit records rather than unvalidated JSON lists.
- Task-to-ledger output links are explicit records.
- Task activities remain plain-language first and do not hide research
  evidence that belongs on the research ledger or measurement evidence.
- Early project/session close requires the explicit request/confirm tool
  handshake, with an agent-readable warning on the request step.
