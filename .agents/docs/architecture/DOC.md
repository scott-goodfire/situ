# Architecture

This document describes the end-state backend architecture for the new Situ app:
a small set of obvious primitives, plain markdown handoffs, durable state, and
very little hidden workflow logic.

## Product Shape

Situ is a local autoresearch app. A user gives the app a goal for a repository.
Claude Managed Agents then help explore ideas, run experiments, verify evidence,
and report what happened.

The backend should feel closer to Linear than to a workflow engine:

- agents create and move ordinary tasks
- handoff content is markdown, not a private payload format
- assignment is visible, reversible, and inspectable
- notifications wake sleeping agents like an inbox, not a workflow queue
- stale work is inferred from quiet assignees, not lease machinery
- labels carry nuance that should not become status sprawl
- views are derived from records, not separate workflow state
- the same primitives power the UI, API, CLI, and agent tools

The backend should avoid secret control flow. If something important happened,
there should be a visible record a human can read.

Humans should not need to operate the primitive board directly. The normal human
experience is goal entry, progress summaries, read-only inspection, final
reports, and occasional steering. Agents use the primitives the way humans use a
focused issue tracker.

```text
Human goal
  -> Project
      -> agent workspace
          -> tasks, comments, notifications
          -> experiments, measurements, reviews, artifacts
      -> human summary views and reports
```

## Human Linear Parallels

Situ is not a Linear clone, and Linear's agent features are not the reference
point. The useful reference is how humans use Linear to coordinate work through
clear primitives: issues, comments, statuses, labels, attachments, and saved
views.

```text
Human creates issue        -> Situ agent creates Task
Human writes comment       -> Situ agent writes Comment
Human moves status         -> Situ agent updates Task status
Human assigns owner        -> Situ agent claims Task
Human applies label        -> Situ agent applies Label
Human attaches evidence    -> Situ agent creates Artifact
Human saves filtered view  -> Situ derives a view from primitive fields
Human checks activity      -> Situ records Events for audit/debug
Human gets notified        -> Situ creates Notifications for sleeping agents
```

The useful lesson is not the exact table names. It is the restraint:

- status is navigation, not policy
- labels classify work without creating new workflows
- assignment says who owns the next action
- comments carry narrative handoff
- notifications tell actors what needs their attention
- activity/events explain what happened
- custom views are saved queries over ordinary records

Situ's product UI can be more summary-oriented than Linear because humans are
not expected to live in the task board. The board still needs to be coherent
because agents live there, and humans must be able to inspect it when something
is surprising.

## Related System Context

Several current agent systems point in the same direction, but none should be
copied wholesale.

```text
Codex /goal
  persistent objective on an active runtime context
  -> Situ Project goal + AgentSession context

Cursor /orchestrate
  fan out a large task across parallel agents
  -> Situ Coordinator creates Tasks; workers claim them; synthesis reconciles

Sakana AI Scientist-v2
  progressive agentic tree search over experiments
  -> Situ Experiments form lineage; Measurements/Reviews score branches
```

The shared pattern is durable intent plus visible work products. The system
should not hide the search in a private run graph when tasks, comments,
experiments, measurements, reviews, and artifacts can explain it.

```text
Project goal
  -> Coordinator task
      -> Explorer tasks
      -> Scientist experiment tasks
          -> Experiments
              -> Measurements
              -> Reviews
      -> Synthesis task
      -> Report artifact
```

Long-running autonomy should look like a series of human-readable checkpoints:
current objective, active task, evidence produced, review state, and next
decision. That maps to Codex-style goals without making an agent session the
product source of truth.

GitHub pull request review is also a useful analogy. A Linear issue describes
intended work. A GitHub pull request proposes a concrete branch. CI checks
produce evidence. Reviews approve, comment, or request changes. Review
discussion happens around the proposed change. Situ should mirror that shape:

```text
Task          -> issue-like intended work
Experiment    -> PR-like candidate branch
Measurement   -> CI/check-like observed evidence
Review        -> approve/request-changes-like judgment
Comment       -> review discussion and handoff
Notification  -> inbox item that wakes the right agent
```

The important detail is revision awareness. An experiment can keep the same
identity while its candidate commit changes during review. Measurements and
reviews name the commit/evidence they observed so an old approval does not
silently apply to a new candidate.

## Design Principles

### Primitives over workflows

The app should model the things users and agents naturally talk about. A task is
a task. A comment is a comment. A review is a review. The scheduler should not
encode a research protocol that only it understands.

### Status is navigation

Statuses should help people and agents find the right work. They should not
encode every reason, sub-state, exception, or branch in the search. If the
answer to "what should happen next?" requires prose, put that prose in markdown.
If the answer requires filtering, use labels or target links before adding a new
status.

### Markdown first

Task descriptions, comments, handoffs, and review notes should be markdown.
Structured fields are for indexing, filtering, status, ownership, and durable
references. They are not the place to encode the whole meaning of a handoff.

### Visible state changes

Every meaningful state change should be visible in the UI and event log. An
agent should be able to recover context by reading the board, not by knowing the
call stack that produced it.

### Agents act like users

An agent should use the app by reading tasks, assigning itself, commenting,
moving statuses, creating experiments, and recording evidence. Agent-specific
tools exist to make those actions reliable, not to hide a separate workflow
system behind the UI.

### Package boundaries are product boundaries

When a primitive is coherent enough to test and document alone, it should live
in a package under `projects/app/packages/*`. The app package should wire those
packages together; it should not own every domain concept directly.

Packages are useful when they make the backend easier to reason about:

- one README per primitive or primitive cluster
- one table-definition owner
- one repository surface
- one focused test suite
- no static dependency on `@situ/app`

Do not create packages for tiny helpers that are only used in one place. Do
extract packages for durable concepts such as tasks, comments, experiments, and
reviews. Notifications also deserve a package because they are an inbox
primitive, not scheduler-local state.

New primitive packages are for concepts with their own lifecycle, UI surface,
sync records, repository, and tests. Extend an existing package when the new
idea is only metadata, a relationship, or a derived view of an existing
primitive. Keep durable product concepts out of app-level runtime folders.

### Minimal automation

The backend automates only the boring infrastructure:

- start and resume Managed Agent sessions
- expose tools that mutate durable records
- create inbox notifications from visible state changes
- notice stale assignments
- run commands in the right workspace
- store events and outputs

The agents own planning and interpretation.

## Core Primitives

### Workspace

A `Workspace` is the local repository Situ is operating on.

It records:

- absolute repo path
- workspace key
- default branch and initial commit when known
- Situ home paths for sessions, worktrees, and reports

There is usually one active workspace per local app process.

### Project

A `Project` is the user's research goal.

It records:

- goal markdown
- status: `active`, `paused`, `blocked`, `complete`, `archived`
- current baseline summary
- current answer summary
- confidence summary
- blockers summary
- open questions summary
- progress checkpoints summary
- final result summary
- timestamps

The project is the top-level container. It should not own complex workflow
state. The visible task board owns the current state of the run.

`Project` is the human-level object. It is where the user's objective, current
answer, open questions, and final outcome belong. Agent sessions may carry the
goal in context, but the project record is the durable source of truth.

### Task

A `Task` is the main unit of agent planning, handoff, execution, and review.
It is the Situ equivalent of a Linear issue.

It records:

- title
- body markdown
- status
- type
- priority
- creator actor
- assignee actor
- active agent session, when a Managed Agent is currently working
- parent task
- project
- target record, when useful
- labels
- last activity timestamp
- timestamps

Suggested statuses:

```text
triage -> backlog -> in_progress -> in_review -> done
                         |              |
                         v              v
                      blocked        rejected
```

Suggested task types:

- `idea` - a possible direction, not yet ready to run
- `explore` - inspect the repo or research space
- `experiment` - make and measure a candidate change
- `debug` - recover a broken candidate or command
- `review` - verify evidence or attack a claim
- `synthesis` - combine, summarize, or decide next direction
- `report` - produce user-facing output

These types are filters and cues, not a workflow engine. An agent can read a
task and decide what it means from the markdown.

Task ownership should stay simple:

- `assigneeActorId` is the visible owner of the next action.
- `assigneeActorKind` says whether that owner is a human, agent, or system.
- `activeAgentSessionId` points at transport state and should not be used as
  ownership.

For a fully autonomous run, assigning a task directly to a scientist agent is
the normal case. Human steering is captured in the project goal, comments, and
high-level controls, not in a second ownership model. If the product later
needs separate "accountable owner" and "current worker" fields, add them only
after the distinction is visible in the human UI.

Task detail is the canonical page for handoff context. It should render:

- title, body, status, type, priority, assignee, and labels
- parent and child tasks
- linked target record
- comments
- reviews
- experiments and measurements linked to the task
- artifacts
- event timeline
- related notifications
- active or recent agent sessions

### Label

A `Label` is a lightweight classifier for tasks.

It records:

- name
- optional group
- optional color
- project or workspace scope
- archived timestamp

Labels are where nuance goes when nuance should be filterable:

- `area:sync`
- `risk:high`
- `needs:verification`
- `signal:promising`
- `source:agent`

Labels are not ownership, status, or policy. They should not trigger hidden
workflow by themselves. A scheduler may filter on labels, but it should still
act by making visible task, comment, or event changes.

### Comment

A `Comment` is an update on a task or project.

It records:

- markdown body
- author, human or agent
- task or project target
- optional cited records
- created timestamp

Comments are the default handoff channel. If an agent needs another agent to
know something, it should comment or create a task.

Use comments for narrative context: what was tried, what changed, what is
confusing, what should be reviewed next. Do not store large logs in comments.
Logs belong in artifacts, with the comment linking to the artifact and
summarizing the useful part.

### Notification

A `Notification` is an inbox item for an actor.

It records:

- recipient actor
- type
- target record
- title
- optional markdown body
- read timestamp
- dismissed timestamp
- snoozed until timestamp
- delivery attempt timestamps, when useful
- created timestamp

Notifications are wake triggers, not workflow jobs. They say "this needs your
attention"; the agent still wakes up, reads the target task or experiment, and
decides what to do through normal tools.

Examples:

- a task is assigned to an agent
- a task moves to `in_review` and a verifier should inspect it
- a verifier requests changes on an experiment
- a comment mentions an agent
- human steering updates the project goal or priority

Unread notifications are the scheduler's main signal for waking sleeping
agents. Read state means the inbox item was seen. Dismissed state means the
recipient cleared it from the inbox. Snoozed notifications are temporarily
hidden from wake scans. These are visible inbox states, not leases or job
completion markers.

### Experiment

An `Experiment` is a concrete candidate attempt. It is closest to a pull
request: a stable candidate branch that may receive more commits during review.

It records:

- title and summary markdown
- associated task
- worktree path
- base commit
- current candidate commit
- status: `active`, `kept`, `discarded`, `crashed`, `invalid`
- parent experiment, when it branches from a prior candidate

Experiments are for candidate lineage. They should not replace tasks. The task
explains the assignment; the experiment records what was actually tried.

Do not create a new experiment for every requested fix. If the scientist is
fixing the same candidate branch after review feedback, update the same
experiment's candidate commit and attach new measurements and reviews to that
commit. Create a child experiment when the idea branches into a meaningfully
different approach.

Use an experiment when there is a concrete candidate attempt with evidence. Do
not create experiments for vague ideas, reading notes, or one-off questions.
Those belong in tasks and comments until a candidate exists.

A search branch is not the same thing as an experiment. An experiment is one
attempt. A branch is a higher-level search lineage only if the product needs to
track branch status, frontier position, or best-known score as first-class
state. Until then, branch views can be derived from experiments and
measurements.

### Measurement

A `Measurement` is an observed result.

It records:

- experiment or task target
- observed commit, when the target is an experiment
- metric name
- value
- unit or direction, when known
- body markdown for command output and caveats
- payload JSON for raw machine-readable details

Important metrics get typed fields. Messy command output stays in markdown or an
artifact.

Measurements should be boring observations, not conclusions. A measurement can
say `dev_accuracy = 0.755556`; a review or comment should say whether that
number is trustworthy or useful.

Measurements should be revision-aware when code changed. If an experiment moves
from commit `def222` to `ghi333`, the old measurements remain attached to
`def222` and new measurements are recorded for `ghi333`.

### Review

A `Review` is a verifier's judgment.

It records:

- target task, experiment, measurement, artifact, or report
- reviewed commit, when the target is an experiment
- reviewed measurements and artifacts, when relevant
- status: `approved`, `changes_requested`, `needs_more_evidence`, `rejected`,
  or `commented`
- markdown judgment
- reviewer
- cited records

Multiple reviews can attach to the same target. A "jury" is just several
reviews plus a synthesis task or comment that explains the decision.

Reviews are the formal judgment primitive. Use them when the answer should be
queryable later. Use comments for ordinary discussion.

A review is a judgment of specific evidence. If the candidate commit changes,
the previous review remains useful history but does not automatically approve
the new commit.

### Artifact

An `Artifact` is a file or generated body worth keeping.

It records:

- target record
- kind: `patch`, `log`, `report`, `plot`, `dataset`, `other`
- title
- path
- source commit, when the artifact was produced from an experiment worktree
- media type
- optional body markdown

Artifacts store bulky evidence outside normal comments.

Artifacts should be linked from comments, reviews, measurements, or tasks so the
reader understands why the file matters. A bare artifact path is storage, not a
handoff.

### Agent

An `Agent` is a visible actor.

It records:

- display name
- role profile
- model
- status
- remote Claude agent id
- default task filters

Roles are product behavior, not a TypeScript state machine. A scientist is an
agent whose instructions and task filters make it good at experiment tasks.

Human, system, and agent actors can all appear in events and comments. The app
does not need a full users package for the local single-user case; actor fields
can store `actorKind` plus `actorId`. `Agent` records are only for managed agent
actors that need role profile, model, remote id, and task filters.

### AgentSession

An `AgentSession` is a Claude Managed Agents runtime session.

It records:

- local agent id
- remote session id
- remote session thread id when present
- project or task context
- status
- last activity timestamp
- remote event cursor

Agent sessions are transport and observability records. They should not be the
product source of truth. Product state lives in projects, tasks, comments,
notifications, experiments, measurements, reviews, and artifacts.

If an agent session vanishes, the task should still explain the work. If a task
is deleted or moved, the agent session should not keep acting as if the old
product state is current.

### Event

An `Event` is an append-only audit entry.

It records:

- type
- actor
- target
- message
- payload JSON
- created timestamp

Events support timelines, debugging, and stale-agent detection. They should be
derived from visible actions where possible.

Use events for auditability and debugging, not handoff prose. If another agent
needs to read the update as part of its work, write a comment as well.

## How The Models Are Used

Inside the agent workspace, the task detail page is the center of gravity. Most
records should be reachable from a task, even when they can also be listed
globally.

```text
Project
  -> Task
      -> comments          # narrative handoff
      -> notifications     # inbox wake triggers
      -> labels            # filterable nuance
      -> experiments        # concrete attempts
          -> measurements   # observed results
          -> artifacts      # logs, patches, reports, plots
          -> reviews        # judgments
      -> events             # audit trail
      -> agent sessions    # Managed Agents transport
```

When choosing where data belongs:

- create a task when an agent may need to decide, do, verify, or summarize work
- add a comment when another agent needs narrative context
- create a notification when an actor should wake up or pay attention
- add a label when the task should be easier to find or group
- create an experiment when a concrete candidate attempt starts
- create a measurement when an observed value should be queryable
- create a review when a judgment should be queryable
- create an artifact when output is too large, file-like, or worth preserving
- record an event when the system needs an audit trail
- update an agent session when Claude transport state changes

The split between comments, notifications, events, and agent sessions is
important:

```text
Comment
  human-readable work narrative
  "I tried X, got Y, please verify Z"

Notification
  inbox item and wake trigger
  "Changes requested on exp_123"

Event
  append-only audit/debug fact
  "task.status changed from in_progress to in_review"

AgentSession
  Managed Agents transport state
  "remote session thread abc last emitted event cursor 42"
```

Views are queries over primitives, not new workflow tables:

```text
Backlog view
  tasks where status = backlog

Review queue
  tasks where status = in_review
  plus reviews and latest measurements

Agent inbox
  unread, undismissed, unsnoozed notifications grouped by recipient

Active agent work
  tasks assigned to an agent and currently active

Experiment lineage
  experiments grouped by parentExperimentId
  plus measurements, reviews, and artifacts

Stale assignments
  assigned tasks
  plus agent sessions/events older than threshold
```

If a view cannot be expressed from primitives, first ask which primitive is
missing. Do not add a workflow table to compensate for vague records.

## System Diagram

```text
Web UI
  -> Replicache push/pull
      -> Hono API
          -> app actions
              -> package repositories
                  -> SQLite

CLI
  -> app actions

Agent tools
  -> app actions
      -> package repositories
      -> notifications
      -> events

Scheduler
  -> reads wakeable notifications and stale activity
  -> wakes Managed Agent sessions for notified agents
  -> writes visible comments/status changes
```

The app server is deliberately ordinary:

- Hono for HTTP routes
- SQLite for local durable state
- Drizzle or a similarly direct query layer for schema and migrations
- Replicache-compatible sync for the web app
- Bun for CLI/runtime execution

## Repository Command Surface

`mise.toml` is the canonical command surface for humans, agents, and CI. The
root `mise.toml` is the command index for the whole repo. Projects and packages
can also have local `mise.toml` files so agents can work from the directory
they are changing.

Common commands should be available as `mise run <task>`:

- `update`
- `check`
- `test`
- `lint`
- `format`
- `format:check`
- `typos`
- `markdownlint`
- `actionlint`
- `audit`
- `db:generate`
- `db:migrate`
- `release:build`

Root `package.json` scripts are compatibility wrappers around `mise`. Project
and package `package.json` scripts may also wrap local `mise` tasks for Bun
workspace compatibility, but recurring repo workflows should be surfaced
through `mise` so agents do not have to guess command spelling.

Root namespaced tasks delegate into local project and package tasks:

```text
mise run check
mise run app:check
mise run app:tasks:test

cd projects/app
mise run check

cd projects/app/packages/tasks
mise run test
```

Use `<project>:<task>` for project tasks and `app:<package>:<task>` for app
package tasks. Local project/package task names stay short: `check`, `test`,
`lint`, `format:check`, `build`, `dev`, `generate`, or `spec:check`.

Root `scripts/` contains thin developer and verification helpers. `config/scripts/`
contains release, install, and distribution helpers. Scripts should be boring:
`bash`, `set -euo pipefail`, short step labels, `SITU_*` overrides, and no
hidden product orchestration.

GitHub Actions install tools through mise, install dependencies with Bun, and
call the same `mise run` tasks used locally. Release workflows build
per-platform tarballs, publish checksums, and smoke-test the installed artifact
with isolated `SITU_HOME`, `SITU_INSTALL_HOME`, and `SITU_BIN_DIR`.

Mechanical quality gates apply to both source and the `.agents` layer:
formatting, linting, typechecking, tests, markdownlint, typos, actionlint,
dependency audit, and Fallow-style codebase health checks. No single meta-runner
owns the quality stack; each tool has one job.

Agent skills and policies should stay slim. ADRs and package READMEs/SPECs are
the source of truth. Skills are navigation and procedure aids: they point agents
to the relevant ADRs, package specs, tests, and `mise` commands instead of
repeating large architecture decisions.

## Agent Model

The backend should support both single-agent and multiagent execution, but the
product model should not depend on a specific orchestration pattern.

The simplest useful roster:

```text
Coordinator
  reads project and board
  creates/prioritizes tasks
  asks questions
  decides when to synthesize or report

Explorer
  reads context
  creates idea/explore tasks
  comments with references and hypotheses

Scientist
  claims experiment/debug tasks
  edits isolated worktrees
  records experiments and measurements

Verifier
  claims review tasks or reviews in_review work
  checks evidence and records reviews

Reporter
  claims report tasks
  writes final user-facing artifacts
```

The important part is that every agent uses the same board.

```text
Coordinator creates task
    |
    v
Task: "Try weighted edit costs"
Status: backlog
Type: experiment
Assignee: none
Labels: area:scoring, signal:promising
Body: markdown context and acceptance criteria
    |
    v
Coordinator assigns scientist_1
    |
    v
Notification: "Task assigned: Try weighted edit costs"
Recipient: scientist_1
    |
    v
Scientist wakes, reads notification, opens task, moves to in_progress
    |
    v
Scientist records experiment + measurement, moves task to in_review
    |
    v
Notification wakes verifier_1
    |
    v
Verifier records review, moves task to done or requests changes
```

No hidden function needs to parse a payload and trigger the next step.
Notifications wake agents; the board provides the context.

## Scheduler

The scheduler should be small. It should not own research policy.

Responsibilities:

- periodically inspect tasks and agents
- wake agents with unread, undismissed, unsnoozed notifications
- create notifications for ready work when simple filters match
- continue active agent sessions while they are producing events
- mark quiet assignments as stale
- unassign or requeue stale tasks after a visible comment/event
- run recurring maintenance, such as sync pokes or report generation prompts

The scheduler should prefer human-like rules:

```text
Task is backlog + unassigned + matches Scientist filter
  -> assign visibly on the task
  -> create notification for scientist_1

Notification is unread, undismissed, and unsnoozed for scientist_1
  -> wake or create a Scientist agent session
  -> scientist_1 reads inbox and opens the target task

Task is in_progress + assignee quiet for too long
  -> comment "No activity for 20m; returning to backlog"
  -> clear assignee
  -> move to backlog
```

This is enough. Avoid a separate workflow queue unless the task board and inbox
cannot answer a concrete operational question.

## Staleness Instead of Leases

Ordinary agent work uses visible assignment, notifications, and activity
timestamps.

```text
Task
  assigneeActorKind = agent
  assigneeActorId = scientist_1
  activeAgentSessionId = agent_session_123
  status = in_progress
  lastActivityAt = 2026-05-12T10:20:00Z

AgentSession
  status = idle
  lastEventAt = 2026-05-12T10:21:00Z

Notification
  recipient = scientist_1
  target = task_123
  readAt = 2026-05-12T10:20:10Z
  dismissedAt = null
  snoozedUntil = null

Scheduler sees no activity after threshold
  -> writes a comment
  -> leaves or dismisses the old notification according to visible inbox state
  -> clears assignee
  -> moves task back to backlog
```

This is intentionally less precise than a lease, but it is easier to understand
and inspect. Explicit ownership records are reserved for command execution and
worktree ownership, where collision risk is real.

An unread and undismissed notification can wake an agent more than once. That
is acceptable. If the agent repeatedly wakes and produces no visible activity,
the staleness rule writes a comment and returns the work to the board. A
snoozed notification does not wake the agent until the snooze expires.

## Worktrees and Commands

Worktree isolation is the one place where the backend should be stricter than a
normal task board.

Rules:

- command tools run in an explicit workspace
- candidate mutations happen in experiment worktrees
- every experiment worktree is attached to an `Experiment`
- command output is captured as an artifact or measurement evidence
- subprocess output is captured, not inherited
- app-owned paths resolve through one path module
- destructive git commands are allowed only inside the claimed worktree

```text
Scientist claims task
  -> create Experiment
  -> prepare worktree for Experiment
  -> run command in that worktree
  -> record Measurement
  -> capture candidate commit
```

The task explains why the work exists. The experiment explains what changed.
When review requests changes, the same scientist should normally reopen the
same experiment worktree, commit a fix on the same candidate branch, record new
measurements for the new commit, and resubmit for review. A replacement
scientist can do the same by reading the task, comments, reviews, artifacts, and
worktree state.

Command execution has three layers:

```text
run_experiment_command tool
  -> app action validates actor, task, and experiment
      -> @situ/worktrees resolves cwd and runs the subprocess safely
      -> app action records event, artifact, and parsed measurements
  -> tool returns a concise structured result
```

`@situ/worktrees` owns filesystem safety: cwd resolution, worktree ownership,
environment filtering, timeout handling, and captured stdout/stderr. App actions
own product persistence: events, artifacts, measurements, and task comments.
Agent tools own only schema, profile exposure, and result formatting.

Every command produces a visible event with exit status. Non-empty or truncated
stdout/stderr is stored as an artifact. Measurements are created only when the
action parses real metric values from output. Failed commands still leave events
and usually artifacts so the next agent can inspect the failure.

When a command runs in an experiment worktree, artifacts and measurements record
the commit they came from whenever that commit is known.
`capture_candidate_commit` updates the experiment's current candidate commit; it
does not erase prior
measurements, reviews, or artifacts from older commits.

## Tools

Agent tools should be thin wrappers around product actions:

- list/search/get projects
- list/search/get/update tasks
- list unread notifications
- mark notifications read or unread
- dismiss or snooze notifications
- create comments
- assign/unassign tasks
- add/remove task labels
- create experiments
- create measurements
- create reviews
- create artifacts
- run read-only workspace commands
- run experiment worktree commands
- list recent events

Agent tools should share the same write path as Replicache mutations. A button
click, CLI command, and agent tool call should not have three different ways to
create a task.

Each custom tool has:

- one file
- one concrete description
- one typed input schema
- one structured result shape
- one explicit list of agent profiles that may call it

Prefer tools that map one-to-one with user-visible actions. Avoid tools named
after workflow steps such as `submit_research_task_for_verification` when
`update_task_status({ status: "in_review" })` plus a comment is enough.

Specialized tools are acceptable when they protect a real boundary:

- `prepare_experiment_worktree`
- `run_experiment_command`
- `capture_candidate_commit`

Those tools protect filesystem safety, not product workflow.

Tool results are concise and structured. Success returns data the agent can use.
Failure returns a stable code and a short actionable hint. Tool results never
include secrets, raw credentials, or large prompt payloads.

## Handoff Examples

### Planner to scientist

```text
Task
  title: Try weighted edit costs
  type: experiment
  status: backlog
  assignee: none
  labels: area:scoring, signal:promising, needs:measurement

Body:
  Hypothesis: transpositions and adjacent-key substitutions should be cheaper
  than arbitrary edits.

  Context:
  - baseline dev_accuracy is 0.748148
  - keep dev_wps >= 10
  - edit spell.py only

  Done when:
  - candidate commit exists or the task explains why no candidate was viable
  - harness output is attached
  - dev_accuracy and dev_wps are recorded
  - task is moved to in_review
```

The scientist does not need a private schema. It reads the task like a person.

### Human steering

```text
Human summary view:
  Current best candidate improved dev_accuracy from 0.748148 to 0.755556.
  The verifier flagged possible benchmark leakage.

Human steering input:
  Prioritize leakage checks before running new scoring experiments.

Coordinator action:
  -> creates review task assigned to verifier_1
  -> labels it needs:verification and risk:high
  -> creates notification for verifier_1
  -> comments with the human instruction
```

The human does not need to manipulate task fields. The agent turns steering into
ordinary board changes.

### Scientist to verifier

```text
Comment on task:
  Implemented weighted edit costs in experiment exp_123.

  Result:
  - dev_accuracy: 0.755556
  - dev_wps: 84.2
  - changed files: spell.py
  - candidate commit: abc1234

  I moved this to in_review. Please check for dev-label leakage and confirm
  the speed floor.
```

The verifier can inspect the experiment, measurement, artifact, and diff.

### Requested changes on same experiment

```text
Review on exp_123:
  reviewed commit: def222
  status: needs_more_evidence

Body:
  Accuracy improved, but the weighting looks dev-specific. Please revise the
  candidate before this counts as a win.

Notification:
  recipient: scientist_1
  target: exp_123
  title: Changes requested on exp_123

Scientist wakes:
  -> reads notification
  -> opens task and review
  -> reopens exp_123 worktree
  -> commits ghi333 on the same candidate branch
  -> records new measurements for ghi333
  -> comments "Addressed review feedback"
  -> moves task back to in_review

Second review:
  reviewed commit: ghi333
  status: approved
```

The back-and-forth is PR-like. The experiment remains stable, but the evidence
and reviews are tied to specific commits.

### Stale work recovery

```text
Task: Try keyboard-distance scoring
Status: in_progress
Assignee: scientist_2
Last activity: 45 minutes ago

Scheduler comment:
  No agent activity has been recorded for 45 minutes. Returning this task to
  backlog so another agent can pick it up.

Task update:
  status: backlog
  assignee: none
```

No invisible lease expired. The board says what happened.

### Verifier jury

```text
Task: Review experiment exp_123
Status: in_review

Review A:
  status: approved
  focus: metric comparability

Review B:
  status: needs_more_evidence
  focus: possible benchmark leakage

Task comment from Coordinator:
  Keeping this in_review. The metric moved, but the leakage concern needs a
  focused follow-up task before the candidate can count as a win.
```

The jury is not a special state machine. It is several reviews and a visible
decision.

## Data Ownership

Backend packages should be boring and easy to grep. Prefer package boundaries
for durable primitives and keep `@situ/app` as the runtime shell.

```text
projects/app/src/
  cli.ts
  server.ts
  db/
  routes/
  managed-agents/
  scheduler/
  agent-tools/
  actions/

projects/app/packages/
  projects/
  tasks/
  comments/
  notifications/
  experiments/
  measurements/
  reviews/
  artifacts/
  agents/
  agent-sessions/
  events/
  worktrees/
  common/
```

Each primitive package owns:

- type definitions
- table definitions for the records it owns
- repository functions
- local mutation helpers when they are primitive-specific
- sync serialization for its own records
- focused tests
- a README that explains what belongs there and what does not

The app package owns:

- CLI entrypoints
- HTTP server setup
- Replicache push/pull routes
- Managed Agents integration
- scheduler rules
- cross-package actions
- runtime orchestration around command execution
- package configuration at boot
- database composition, migrations, and transaction boundaries

Packages should not import from `@situ/app`. The app can configure packages with
database, event, clock, and sync dependencies at boot. Cross-package
orchestration should live in the smallest possible app action, tool handler, or
scheduler rule. Do not create a service layer that hides simple record updates.

Runtime integration folders stay in `projects/app/src`, not in packages:

- `agent-tools/` maps Claude tool calls onto app actions.
- `managed-agents/` adapts Anthropic sessions, events, and tool-result routing.
- `scheduler/` decides when visible state should wake or recover agents.
- `routes/` exposes the small HTTP API.
- `db/` composes package tables, runs migrations, and owns sync transactions.

Those folders coordinate multiple primitives and external services. They are not
durable product primitives by themselves.

## Database Composition

Domain packages own table declarations. The app database layer owns the complete
database.

```text
@situ/tasks
  src/schema.ts      # tasks table
  src/repository/   # task reads and primitive writes

@situ/comments
  src/schema.ts      # comments table
  src/repository/   # comment reads and primitive writes

@situ/app/src/db
  schema.ts          # imports all package tables and exports the full schema
  migrate.ts         # applies migrations in one ordered plan
  client.ts          # opens SQLite
  sync.ts            # transaction + sync-version helper
  replicache.ts      # client mutation ids and pull composition
```

This keeps each concept understandable in isolation while keeping migrations and
SQLite ownership centralized. A package author can reason about the `Task`
record without opening a giant central schema file. A database maintainer can
reason about the whole database without each package running its own migrator.

The rule is:

```text
Packages own schema declarations.
The app db layer owns schema composition.
```

Cross-package relationships are represented by clear foreign-key columns such as
`projectId`, `taskId`, `agentId`, and `experimentId`. Intra-package references
can use direct typed references. Cross-package references should avoid creating
tight package dependency cycles; the composed app schema can enforce SQL foreign
keys when that improves integrity without making package imports tangled.

Generic links use explicit target fields:

```text
targetKind = "task" | "experiment" | "measurement" | "artifact" | ...
targetId = opaque id
```

Use generic targets for comments, reviews, artifacts, and events where the point
is "this record can attach to several primitive kinds." Notifications also use
generic targets because the inbox can point at tasks, experiments, reviews,
comments, or projects. Use direct columns such as `taskId` or `experimentId`
when the relationship is part of the primitive's identity or common query path.

Actor references use the same explicit shape:

```text
actorKind = "human" | "agent" | "system"
actorId = opaque id
```

Only `agent` actors require an `Agent` row. The local human and system actors
can be stable ids owned by the app until multi-user collaboration becomes a real
product primitive.

Every UI-visible entity table has:

- `id`
- `createdAt`
- `updatedAt`
- `syncVersion`
- `syncDeleted`

Append-only activity/event tables have `createdAt`, `syncVersion`, and
`syncDeleted`, but do not need `updatedAt`. System tables such as sync clients
can use a smaller shape when they are not product records.

The app database layer owns system tables that are not product primitives:

- `sync_state`
- `replicache_clients`

Those tables support Replicache protocol mechanics. They are not package-owned
domain records.

## Package Contracts

Durable primitive packages have the same basic shape:

```text
projects/app/packages/<name>/
  README.md
  package.json
  tsconfig.json
  src/
    schema.ts
    types.ts
    repository/
    mutations/
    sync.ts
    module.ts
    index.ts
    *.test.ts
```

Utility packages such as `@situ/common` omit record-only files such as
`schema.ts`, `mutations/`, or `sync.ts` when they do not own durable records.
The exception is explicit in that package's README.

The package README explains:

- the primitive it owns
- the tables it owns
- the public repository and mutation functions
- what belongs in the package
- what explicitly belongs in `@situ/app`
- the tests that prove the package contract

Packages expose durable primitives. `@situ/app` composes them into runtime
behavior.

## Shared Backend Conventions

These conventions keep independent package work consistent.

### Write boundaries

Package mutations are local primitive helpers. App actions are the shared write
boundary.

```text
Replicache push
CLI command
agent tool
scheduler rule
  -> app action
      -> package mutations/repositories
      -> notifications when another actor should pay attention
      -> events/comments when user-visible
      -> sync version bump
```

A user-visible intent that changes multiple fields should be one app action and
one synced transaction. For example, claiming a task updates assignee, status,
activity timestamp, and event/comment state together. Clients should not have to
sequence partial writes when partial success would be confusing.

AgentSession startup follows the same rule. If assigning an agent also starts or
resumes a Managed Agent session, the app action should update task assignment,
notification state, agent session state, event state, and sync state in one
transaction where possible.

The boundary also resolves the actor. UI, CLI, scheduler, and agent-tool callers
pass a human or agent actor into the app action; package repositories store the
resulting `createdByActor`, `assigneeActor`, or event actor fields without
knowing where the actor came from.

### Repository vocabulary

Repositories use a small common vocabulary:

- `create` inserts and returns a record
- `get` returns a record or `undefined`
- `require` returns a record or throws a typed precondition error
- `list` returns many records with simple limits
- `search` returns many records with filters
- `upsert` creates or updates by stable identity
- `update<Field>` changes one named area of a record

Every repository method takes one object argument. Callers should never need to
remember positional argument order.

### Status values

Status-bearing packages export both runtime arrays and TypeScript unions:

```ts
export const TASK_STATUSES = [
  "triage",
  "backlog",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "rejected",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
```

Status values are snake_case strings so the database, Replicache payloads, and
agent markdown all use the same spelling.

Status transitions are visible record updates. A review can approve a candidate;
it does not secretly move the task to `done`.

Keep the status set small. Add labels before adding statuses when the new value
only changes filtering, priority, or explanation.

### Mutations and sync

Every UI-visible mutation goes through one synced transaction path. That path:

- validates input
- applies package repository writes
- increments sync version
- records events or comments when the change is meaningful to users
- notifies Replicache clients

Replicache push mutations, CLI commands, scheduler actions, and agent tools use
the same app actions. There is one way to create a task, one way to comment, and
one way to record a measurement.

Package mutation names stay primitive (`task/assign`, `comment/create`,
`measurement/create`). App actions may be compound when the user intent is
compound (`claim_task`, `complete_review`, `run_experiment_command`).

### Sync serialization

Each package owns serialization for its own records and key prefixes. The app
sync route composes package serializers into one pull response.

```text
@situ/tasks          -> tasks/<task-id>
@situ/tasks          -> task-labels/<label-id>
@situ/comments       -> comments/<comment-id>
@situ/notifications  -> notifications/<notification-id>
@situ/experiments    -> experiments/<experiment-id>
@situ/agent-sessions -> agent-sessions/<agent-session-id>
```

Sync membership is explicit. A package table does not reach the web UI merely
because it exists; it reaches the web UI because its serializer is registered in
the app sync composition.

Many relationship rows do not need independent sync keys. For example, task
label assignments can serialize as part of the task record unless the UI needs
to address each assignment as its own object.

### JSON fields

JSON columns are storage details. Repositories parse and stringify them. Callers
see typed objects, not `payloadJson` strings.

Use JSON fields for flexible payloads and raw details. Do not hide first-class
product concepts in JSON when they need filtering, sorting, status, ownership,
or sync keys.

### Stored and derived state

Store source-of-truth evidence. Derive summaries when possible.

- Measurements store raw metric observations.
- Reviews store judgments.
- Experiments store candidate lineage.
- Tasks store visible work state.
- Notifications store inbox state and wake intent.

Values such as best score, active frontier, or branch health can be derived from
those records. Materialize them only when the UI or scheduler needs fast reads,
and keep the materialized value tied back to the source records it summarizes.

### IDs and timestamps

Production entity ids are opaque UUIDs unless a documented operational reason
requires a readable id. Agents treat ids as opaque strings.

Persisted timestamps are ISO strings from one clock helper. Repository writes
compute one `now` value and reuse it for related rows written in the same
transaction.

### Errors

Repositories throw typed precondition errors for missing records and invalid
state. Agent tools return structured envelopes with stable `code`, `hint`, and
optional `details` fields. CLI and HTTP boundaries translate errors for humans.

Catch blocks either log, throw, return an explicit fallback, or make a visible
state change. Silent catches are not part of the architecture.

### `@situ/common`

Owns shared helpers that have no product dependency:

- ids
- timestamps
- JSON parsing
- result envelopes
- precondition errors
- pagination limits
- required text validation
- small repository test helpers

It must stay free of app, database, Claude, web, and scheduler imports.

### `@situ/projects`

Owns `Project`.

Records:

- `projects`

Repository surface:

- create project
- update goal markdown
- update status
- update baseline summary
- update current answer summary
- update open questions summary
- update final result summary
- list active and recent projects

Mutations:

- `project/create`
- `project/update`
- `project/update_status`

Package invariants:

- a project has durable goal markdown
- project summaries are human-facing and derived from current primitive records
- terminal projects do not return to active without an explicit reopen mutation
- project records serialize cleanly for Replicache

### `@situ/tasks`

Owns `Task`, task assignment state, and task labels.

Records:

- `tasks`
- `task_labels`
- `task_label_assignments`

Repository surface:

- create task
- update title, body, type, status, priority, target, parent, and labels
- assign and unassign an actor
- attach and clear active agent session
- create, archive, and list labels
- list by project, status, assignee, target, and updated timestamp
- list by label, type, priority, and active agent session
- find stale assigned tasks

Mutations:

- `task/create`
- `task/update`
- `task/update_status`
- `task/assign`
- `task/unassign`
- `task/label`

Package invariants:

- every task belongs to one project
- task body is markdown
- status changes update `lastActivityAt`
- assignment changes are visible record changes, not hidden leases
- `activeAgentSessionId` is transport state and does not replace assignment
- parent tasks belong to the same project
- labels are filter metadata; they do not trigger workflow by themselves
- archived labels remain on existing tasks for history but are not suggested for
  new tasks

### `@situ/comments`

Owns markdown comments on projects and tasks.

Records:

- `comments`

Repository surface:

- create comment
- list by target
- list recent by project

Mutations:

- `comment/create`

Package invariants:

- comment body is markdown
- comment target is a project or task
- comments are append-only except for soft deletion if needed
- comments can cite other durable records by kind/id

### `@situ/notifications`

Owns actor inbox items.

Records:

- `notifications`

Repository surface:

- create notification
- list unread by recipient
- list recent by recipient
- mark read
- mark unread
- dismiss
- snooze

Mutations:

- `notification/mark_read`
- `notification/mark_unread`
- `notification/dismiss`
- `notification/snooze`

Package invariants:

- notification recipient is an explicit actor
- notification target is explicit
- notifications wake agents but do not prescribe the action to take
- read, dismissed, and snoozed timestamps are ordinary visible inbox state, not
  leases
- notifications can be regenerated when still relevant

### `@situ/experiments`

Owns PR-like candidate attempts and lineage.

Records:

- `experiments`

Repository surface:

- create experiment
- attach to task
- set worktree path
- set base and candidate commits
- update current candidate commit
- update status
- list by task, project, parent experiment, and status

Mutations:

- `experiment/create`
- `experiment/update`
- `experiment/update_status`
- `experiment/capture_commit`

Package invariants:

- every experiment belongs to a project
- every experiment may point at the task that requested it
- worktree path, base commit, and candidate commit are explicit fields
- candidate commit may change as review feedback is addressed on the same branch
- child experiments represent meaningfully different approaches, not every fix
- discarded and invalid experiments remain visible

### `@situ/measurements`

Owns observed metric results.

Records:

- `measurements`

Repository surface:

- create measurement
- list by experiment, task, project, metric name, observed commit, and created
  timestamp
- summarize latest metrics for a project

Mutations:

- `measurement/create`

Package invariants:

- measurement target is explicit
- observed commit is stored when the measurement came from experiment code
- metric name and value are indexed fields
- raw command output or caveats live in markdown body or artifacts
- measurements are append-only

### `@situ/reviews`

Owns verifier judgments.

Records:

- `reviews`

Repository surface:

- create review
- list by target, reviewer, status, reviewed commit, and project
- summarize review status for a task or experiment

Mutations:

- `review/create`

Package invariants:

- review target is explicit
- reviewed commit is stored when the review judged experiment code
- cited measurements and artifacts identify the evidence under review
- judgment body is markdown
- multiple reviews may attach to one target
- review status does not secretly transition task status; agents or app actions
  make visible task updates

### `@situ/artifacts`

Owns durable output files and generated bodies.

Records:

- `artifacts`

Repository surface:

- create artifact
- list by target, kind, project, and created timestamp
- list by source commit when applicable
- resolve artifact path

Mutations:

- `artifact/create`

Package invariants:

- artifact target is explicit
- artifact path is inside a Situ-managed output directory unless marked
  external
- source commit is stored when the artifact came from an experiment worktree
- large output is stored by path, not copied into task markdown

### `@situ/agents`

Owns visible agent actors and role profiles.

Records:

- `agents`

Repository surface:

- create or update agent profile
- store remote Claude agent id and version
- update status
- list agents by role and active state

Mutations:

- `agent/update_status`

Package invariants:

- agent records are visible actors
- role profile is descriptive and filter-oriented
- agents are assigned tasks directly, the same way a person would own work
- default task filters describe what the agent is likely to claim; they are not
  hard permissions
- agent records do not own product state; tasks, comments, reviews, and
  experiments do

### `@situ/agent-sessions`

Owns Managed Agent runtime sessions.

Records:

- `agent_sessions`

Repository surface:

- create agent session
- attach agent session to project, task, and agent
- store remote session id and remote session thread id
- update status and last activity
- list active, idle, failed, and stale agent sessions

Mutations:

- internal app actions only, unless the UI needs manual pause or close controls

Package invariants:

- agent session records are transport and observability state
- agent sessions do not replace task assignment
- child Claude session threads are first-class `AgentSession` rows
- task `activeAgentSessionId` is a convenience pointer to the current agent
  session, not the source of truth for who owns the task

### `@situ/events`

Owns append-only audit events.

Records:

- `events`

Repository surface:

- record event
- list by target, actor, type, and created timestamp
- stream recent events for UI and CLI

Mutations:

- internal app actions only

Package invariants:

- events are append-only
- important product changes create events
- events may carry payload JSON, but the message stays human-readable

### `@situ/worktrees`

Owns filesystem isolation for candidate work.

Records:

- optional `worktrees`, if experiment fields alone are not enough

Repository and action surface:

- prepare worktree for experiment
- resolve workspace for command execution
- run command in read-only workspace
- run command in experiment worktree
- capture candidate commit
- clean up worktree

Package invariants:

- mutating commands run only in experiment worktrees
- read-only commands run without creating candidate state
- destructive git commands are scoped to the experiment worktree
- command output path is explicit

## API Shape

The HTTP API should stay small. Most writes should arrive through Replicache
`push` mutations, not through a wide REST surface.

```text
GET    /api/status
POST   /api/replicache/pull
POST   /api/replicache/push
GET    /api/events
```

The `push` endpoint applies primitive mutations:

```text
project/create
project/update
project/update_status
task/create
task/update
task/assign
task/unassign
task/update_status
task/label
comment/create
notification/mark_read
notification/mark_unread
notification/dismiss
notification/snooze
experiment/create
experiment/update
experiment/update_status
measurement/create
review/create
artifact/create
agent/update_status
```

The push handler validates, applies, records events, and bumps sync state. It
does not run research policy.

Non-Replicache endpoints should exist only when the operation is not a normal
record mutation:

- status and health checks
- event streaming or polling
- local secret setup
- command output download
- Managed Agents callbacks, if needed

Agent tools and CLI commands can call the same app actions that Replicache
mutations use. They do not need their own public POST endpoints unless there is a
real external integration boundary.

## Sync and UI

The web app should read the same durable records the agents use.

The primary human experience is summary-first:

- project goal and current answer
- best candidate and confidence
- recent progress checkpoints
- active blockers and questions
- final report artifacts
- read-only drilldown into evidence

Inspection views expose the primitive board when a human wants to understand or
steer the run:

- project overview
- agent inbox
- task board
- task detail
- label-filtered task lists
- active agent work
- experiment lineage
- measurement table
- review panel
- event timeline
- report artifacts

The UI should not need to understand hidden backend transitions. If the UI can
render tasks, comments, notifications, experiments, measurements, reviews,
artifacts, agents, agent sessions, and events, it can explain the run.

Human-facing summaries should be generated from the same records, not from
agent memory. Saved inspection views should be stored as query definitions over
primitive fields: statuses, assignees, labels, targets, active agent sessions, and
timestamps. Do not materialize view membership unless performance demands it.

## Managed Agents Integration

Claude Managed Agents are the execution substrate, not the product model.

The backend should persist:

- remote agent ids
- remote session ids
- remote session thread ids
- raw events
- tool calls and results
- notification read/dismissed/snoozed state
- last activity timestamps

For multiagent sessions, child Claude session threads should become
`AgentSession` records. Tool calls from child sessions should include the local
`agentSessionId` and the remote Claude thread id in tool context. The tool
should still mutate normal product records.

```text
Claude session thread
  -> tool call: update_task_status
      -> Task status changes
      -> Event recorded
      -> UI updates
```

The agent session is how Claude communicated. The task is what changed.
The notification is why the agent woke up.

Managed Agent activity should be projected into product records by audience:

```text
actor should wake or pay attention
  -> Notification

tool call started/finished
  -> Event

progress another agent should read
  -> Comment

command output or generated file
  -> Artifact

observed metric
  -> Measurement

final judgment
  -> Review or Comment

transport cursor, remote ids, raw callback metadata
  -> AgentSession
```

This keeps Claude transport state from leaking into the product model. The
product history should read as tasks, comments, notifications, experiments,
measurements, reviews, artifacts, and events.

## Reporting

Reports should be generated from durable records, not from agent memory.

Reporter input:

- project goal and baseline
- completed and rejected tasks
- experiment lineage
- measurements
- reviews
- artifacts
- important comments and events
- unresolved notifications when they explain current blockers

Reporter output:

- `REPORT.md`
- optional charts
- patch artifacts for kept candidates
- open questions and next tasks

The report should explain both wins and discarded branches. Discarded work is
part of the search history.

## Testing Boundaries

Package behavior is tested where the behavior lives.

- package repositories and mutations have co-located deterministic tests
- app actions have tests at the action boundary
- sync composition has tests for push, pull, deletion, and key prefixes
- worktree and command execution have tests with temporary directories
- scheduler rules have tests over visible task, agent, agent session, and event rows
- notification wake rules have tests over unread, read, dismissed, snoozed, and
  stale inbox rows

Tests do not call live LLMs. Model-dependent behavior lives in evals. Live evals
assert against durable records, not final prose alone.

The goal is that a sub-agent can implement one package and run that package's
tests without understanding the entire backend.
