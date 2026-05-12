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
- stale work is inferred from quiet owners or delegates, not lease machinery
- labels carry nuance that should not become status sprawl
- views are derived from records, not separate workflow state
- the same primitives power the UI, API, CLI, and agent tools

The backend should avoid secret control flow. If something important happened,
there should be a visible record a human can read.

```text
User goal
  -> Project
      -> Tasks
          -> agent comments, experiments, measurements, reviews, artifacts
      -> Report
```

## Linear Parallels

Situ is not a Linear clone, but Linear is the right product reference for the
backend shape. The data model should feel like an issue tracker that agents can
use naturally.

```text
Linear issue           -> Situ Task
Linear issue status    -> Situ Task status
Linear label           -> Situ Task label
Linear issue comment   -> Situ Comment
Linear attachment      -> Situ Artifact
Linear project         -> Situ Project
Linear user/app user   -> Situ human actor / Agent
Linear agent session   -> Situ Thread
Linear activity feed   -> Situ Event timeline
Linear custom view     -> Situ derived view
```

The useful lesson is not the exact table names. It is the restraint:

- status is navigation, not policy
- labels classify work without creating new workflows
- assignment says who owns the next action
- delegation says an agent is working on someone's behalf
- comments carry narrative handoff
- activity/events explain what happened
- custom views are saved queries over ordinary records

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
reviews.

New primitive packages are for concepts with their own lifecycle, UI surface,
sync records, repository, and tests. Extend an existing package when the new
idea is only metadata, a relationship, or a derived view of an existing
primitive. Keep durable product concepts out of app-level runtime folders.

### Minimal automation

The backend automates only the boring infrastructure:

- start and resume Managed Agent sessions
- expose tools that mutate durable records
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
- status: `active`, `paused`, `complete`, `failed`, `canceled`
- current baseline summary
- final result summary
- timestamps

The project is the top-level container. It should not own complex workflow
state. The visible task board owns the current state of the run.

### Task

A `Task` is the main unit of planning, handoff, execution, and review.
It is the Situ equivalent of a Linear issue.

It records:

- title
- body markdown
- status
- type
- priority
- creator actor
- assignee actor
- delegated agent, when different from the assignee
- active thread, when a Managed Agent is currently working
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
- `delegatedAgentId` is optional and means an agent is working on behalf of the
  assignee.
- `activeThreadId` points at transport state and should not be used as
  ownership.

For a fully autonomous run, assigning a task directly to a scientist agent is
fine. For human-supervised work, assign the task to the human or coordinator and
set `delegatedAgentId` to the working agent. Do not create a second ownership
model in scheduler state.

Task detail is the canonical page for handoff context. It should render:

- title, body, status, type, priority, assignee, delegated agent, and labels
- parent and child tasks
- linked target record
- comments
- reviews
- experiments and measurements linked to the task
- artifacts
- event timeline
- active or recent threads

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

### Experiment

An `Experiment` is a concrete candidate attempt.

It records:

- title and summary markdown
- associated task
- worktree path
- base commit
- candidate commit
- status: `active`, `kept`, `discarded`, `crashed`, `invalid`
- parent experiment, when it branches from a prior candidate

Experiments are for candidate lineage. They should not replace tasks. The task
explains the assignment; the experiment records what was actually tried.

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

### Review

A `Review` is a verifier's judgment.

It records:

- target task, experiment, measurement, artifact, or report
- status: `passed`, `failed`, `suspicious`, `needs_more_evidence`
- markdown judgment
- reviewer
- cited records

Multiple reviews can attach to the same target. A "jury" is just several
reviews plus a synthesis task or comment that explains the decision.

Reviews are the formal judgment primitive. Use them when the answer should be
queryable later. Use comments for ordinary discussion.

### Artifact

An `Artifact` is a file or generated body worth keeping.

It records:

- target record
- kind: `patch`, `log`, `report`, `plot`, `dataset`, `other`
- title
- path
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

### Thread

A `Thread` is a Claude Managed Agents session or subagent session thread.

It records:

- local agent id
- remote session id
- remote session thread id when present
- project or task context
- status
- last activity timestamp
- raw event cursor

Threads are transport and observability records. They should not be the product
source of truth. Product state lives in projects, tasks, comments, experiments,
measurements, reviews, and artifacts.

If a thread vanishes, the task should still explain the work. If a task is
deleted or moved, the thread should not keep acting as if the old product state
is current.

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

The task detail page is the center of gravity. Most records should be reachable
from a task, even when they can also be listed globally.

```text
Project
  -> Task
      -> comments          # narrative handoff
      -> labels            # filterable nuance
      -> experiments        # concrete attempts
          -> measurements   # observed results
          -> artifacts      # logs, patches, reports, plots
          -> reviews        # judgments
      -> events             # audit trail
      -> threads            # Managed Agents transport
```

When choosing where data belongs:

- create a task when someone may need to decide, do, verify, or summarize work
- add a comment when someone needs narrative context
- add a label when the task should be easier to find or group
- create an experiment when a concrete candidate attempt starts
- create a measurement when an observed value should be queryable
- create a review when a judgment should be queryable
- create an artifact when output is too large, file-like, or worth preserving
- record an event when the system needs an audit trail
- update a thread when Claude transport state changes

The split between comments, events, and threads is important:

```text
Comment
  human-readable work narrative
  "I tried X, got Y, please verify Z"

Event
  append-only audit/debug fact
  "task.status changed from in_progress to in_review"

Thread
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

Delegated work
  tasks where delegatedAgentId is not null

Experiment lineage
  experiments grouped by parentExperimentId
  plus measurements, reviews, and artifacts

Stale assignments
  tasks with assignee/delegated agent
  plus threads/events older than threshold
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
      -> events

Scheduler
  -> reads package repositories
  -> wakes Managed Agent threads
  -> writes visible comments/status changes
```

The app server is deliberately ordinary:

- Hono for HTTP routes
- SQLite for local durable state
- Drizzle or a similarly direct query layer for schema and migrations
- Replicache-compatible sync for the web app
- Bun for CLI/runtime execution

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
Scientist sees it, assigns self or becomes delegated agent, moves to in_progress
    |
    v
Scientist records experiment + measurement, moves task to in_review
    |
    v
Verifier sees it, records review, moves task to done or rejected
```

No hidden function needs to parse a payload and trigger the next step. The board
is the trigger.

## Scheduler

The scheduler should be small. It should not own research policy.

Responsibilities:

- periodically inspect tasks and agents
- wake agents whose filters match ready work
- continue active agent threads while they are producing events
- mark quiet assignments as stale
- unassign or requeue stale tasks after a visible comment/event
- run recurring maintenance, such as sync pokes or report generation prompts

The scheduler should prefer human-like rules:

```text
Task is backlog + unassigned + matches Scientist filter
  -> wake or create a Scientist thread
  -> assign or delegate visibly on the task

Task is in_progress + assignee quiet for too long
  -> comment "No activity for 20m; returning to backlog"
  -> clear assignee
  -> clear delegated agent
  -> move to backlog
```

This is enough. Avoid a separate queue table unless the task board cannot answer
a concrete operational question.

## Staleness Instead of Leases

Ordinary agent work uses visible assignment and activity timestamps.

```text
Task
  assigneeActorKind = agent
  assigneeActorId = scientist_1
  delegatedAgentId = null
  activeThreadId = thread_123
  status = in_progress
  lastActivityAt = 2026-05-12T10:20:00Z

Thread
  status = idle
  lastEventAt = 2026-05-12T10:21:00Z

Scheduler sees no activity after threshold
  -> writes a comment
  -> clears assignee
  -> clears delegated agent
  -> moves task back to backlog
```

This is intentionally less precise than a lease, but it is easier to understand
and inspect. Explicit ownership records are reserved for command execution and
worktree ownership, where collision risk is real.

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

## Tools

Agent tools should be thin wrappers around product actions:

- list/search/get projects
- list/search/get/update tasks
- create comments
- assign/unassign tasks
- delegate/undelegate tasks to agents
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
  delegated agent: none
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

### Human delegation to agent

```text
Task
  title: Check whether the ranking metric is stable
  type: review
  status: in_progress
  assignee: scott
  delegated agent: verifier_1
  labels: needs:verification

Comment from Scott:
  Please verify the latest experiment and call out any measurement caveats.
  I am staying assigned so this remains in my review queue, but verifier_1 can
  do the first pass.
```

Delegation is visible state, not an invisible queue message.

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

### Stale work recovery

```text
Task: Try keyboard-distance scoring
Status: in_progress
Assignee: scientist_2
Delegated agent: none
Last activity: 45 minutes ago

Scheduler comment:
  No agent activity has been recorded for 45 minutes. Returning this task to
  backlog so another agent can pick it up.

Task update:
  status: backlog
  assignee: none
  delegated agent: none
```

No invisible lease expired. The board says what happened.

### Verifier jury

```text
Task: Review experiment exp_123
Status: in_review

Review A:
  status: passed
  focus: metric comparability

Review B:
  status: suspicious
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
  experiments/
  measurements/
  reviews/
  artifacts/
  agents/
  threads/
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
is "this record can attach to several primitive kinds." Use direct columns such
as `taskId` or `experimentId` when the relationship is part of the primitive's
identity or common query path.

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
      -> events/comments when user-visible
      -> sync version bump
```

A user-visible intent that changes multiple fields should be one app action and
one synced transaction. For example, claiming a task updates assignee, status,
activity timestamp, and event/comment state together. Clients should not have to
sequence partial writes when partial success would be confusing.

Delegation follows the same rule. If assigning a delegated agent also starts or
resumes a Managed Agent thread, the app action should update task delegation,
thread state, event state, and sync state in one transaction where possible.

The boundary also resolves the actor. UI, CLI, scheduler, and agent-tool callers
pass a human or agent actor into the app action; package repositories store the
resulting `createdByActor`, `assigneeActor`, `delegatedAgentId`, or event actor
fields without knowing where the actor came from.

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

Status transitions are visible record updates. A review can say a task passed;
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
@situ/tasks       -> tasks/<task-id>
@situ/tasks       -> task-labels/<label-id>
@situ/comments    -> comments/<comment-id>
@situ/experiments -> experiments/<experiment-id>
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
- update final result summary
- list active and recent projects

Mutations:

- `project/create`
- `project/update`
- `project/update_status`

Package invariants:

- a project has durable goal markdown
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
- delegate and undelegate an agent
- attach and clear active thread
- create, archive, and list labels
- list by project, status, assignee, target, and updated timestamp
- list by delegated agent, label, type, and priority
- find stale assigned tasks

Mutations:

- `task/create`
- `task/update`
- `task/update_status`
- `task/assign`
- `task/unassign`
- `task/label`
- `task/delegate_agent`
- `task/undelegate_agent`

Package invariants:

- every task belongs to one project
- task body is markdown
- status changes update `lastActivityAt`
- assignment changes are visible record changes, not hidden leases
- delegation changes are visible record changes, not hidden queue messages
- `delegatedAgentId` is present only when there is an assignee the agent is
  acting on behalf of
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

### `@situ/experiments`

Owns candidate attempts and lineage.

Records:

- `experiments`

Repository surface:

- create experiment
- attach to task
- set worktree path
- set base and candidate commits
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
- discarded and invalid experiments remain visible

### `@situ/measurements`

Owns observed metric results.

Records:

- `measurements`

Repository surface:

- create measurement
- list by experiment, task, project, metric name, and created timestamp
- summarize latest metrics for a project

Mutations:

- `measurement/create`

Package invariants:

- measurement target is explicit
- metric name and value are indexed fields
- raw command output or caveats live in markdown body or artifacts
- measurements are append-only

### `@situ/reviews`

Owns verifier judgments.

Records:

- `reviews`

Repository surface:

- create review
- list by target, reviewer, status, and project
- summarize review status for a task or experiment

Mutations:

- `review/create`

Package invariants:

- review target is explicit
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
- resolve artifact path

Mutations:

- `artifact/create`

Package invariants:

- artifact target is explicit
- artifact path is inside a Situ-managed output directory unless marked
  external
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
- agents can be assigned tasks directly or delegated tasks by another assignee
- default task filters describe what the agent is likely to claim; they are not
  hard permissions
- agent records do not own product state; tasks, comments, reviews, and
  experiments do

### `@situ/threads`

Owns Managed Agent sessions and session threads.

Records:

- `threads`

Repository surface:

- create thread
- attach thread to project, task, and agent
- store remote session id and remote session thread id
- update status and last activity
- list active, idle, failed, and stale threads

Mutations:

- internal app actions only, unless the UI needs manual pause or close controls

Package invariants:

- thread records are transport and observability state
- threads do not replace task assignment or task delegation
- child Managed Agent session threads are first-class rows
- task `activeThreadId` is a convenience pointer to the current thread, not the
  source of truth for who owns the task

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
task/delegate_agent
task/undelegate_agent
task/update_status
task/label
comment/create
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

Primary views:

- project overview
- task board
- task detail
- label-filtered task lists
- delegated work
- experiment lineage
- measurement table
- review panel
- event timeline
- report artifacts

The UI should not need to understand hidden backend transitions. If the UI can
render tasks, comments, experiments, measurements, reviews, artifacts, agents,
threads, and events, it can explain the run.

Saved views should be stored as query definitions over primitive fields:
statuses, assignees, delegated agents, labels, targets, and timestamps. Do not
materialize view membership unless performance demands it.

## Managed Agents Integration

Claude Managed Agents are the execution substrate, not the product model.

The backend should persist:

- remote agent ids
- remote session ids
- remote session thread ids
- raw events
- tool calls and results
- last activity timestamps

For multiagent sessions, child session threads should become `Thread` records.
Tool calls from child threads should include the originating thread id in tool
context. The tool should still mutate normal product records.

```text
Claude session thread
  -> tool call: update_task_status
      -> Task status changes
      -> Event recorded
      -> UI updates
```

The thread is how Claude communicated. The task is what changed.

Managed Agent activity should be projected into product records by audience:

```text
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
  -> Thread
```

This keeps the Claude integration replaceable. If the agent platform changes,
the product history still reads as tasks, comments, experiments, measurements,
reviews, artifacts, and events.

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
- scheduler rules have tests over visible task, agent, thread, and event rows

Tests do not call live LLMs. Model-dependent behavior lives in evals. Live evals
assert against durable records, not final prose alone.

The goal is that a sub-agent can implement one package and run that package's
tests without understanding the entire backend.
