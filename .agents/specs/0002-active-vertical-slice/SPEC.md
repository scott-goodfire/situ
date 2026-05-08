# Active Vertical Slice

## Purpose

Situ proves one experience:

> I start an autoresearch session in the terminal and can see the objective,
> active hypotheses, experiments, activity, artifacts, and internal events as the
> loop runs.

Situ supports one local workspace, project-scoped objective and research
context, a few analyses, a few hypotheses, a sequential agent-requested
experiment loop, activity timelines, simple automated automated trust checks, and
one worker path.

## Target User Story

A user runs from the repo they want to observe:

```bash
situ app
situ tui
```

or points Situ at a workspace explicitly:

```bash
situ app
situ tui ~/sandbox/some-project
```

Situ accepts setup context through sparse start/exec inputs and reasonable
defaults. The durable inputs are:

- Objective
- Research context: how progress is judged, what evals/tools/metrics/logs or
  artifacts matter, and what kinds of experiments are in scope

Then Situ:

- Creates local private project state in the canonical app database.
- Starts a new session by default.
- Stores the objective and research context on the attached project.
- Starts a DBOS-backed Pydantic AI agent.
- Lets the agent inspect project and session state, record durable analyses,
  and create hypotheses when useful.
- Requires the agent to establish baseline measurement evidence before treating
  candidate experiments as comparable.
- Runs concrete experiment-task work in managed Git worktrees so candidate code
  edits and worker commands do not mutate the user's selected checkout.
- Records measurement evidence, experiment results, interpretations, and
  decisions as inspectable research records. Cancellation comments carry
  problem reports for suspicious or invalid evidence.
- Renders a live terminal dashboard.
- Supports a headless `situ exec` sibling for automation over the same session
  lifecycle when a TUI is not appropriate.

The Situ install/dev root and the researched workspace are separate
concepts. Runtime state, project identity, worker current directory, and trust
checks are scoped to the researched workspace, even when the TUI and harness
code are launched from the Situ repository.

## In Scope

- Local app server, TypeScript Ink TUI, and headless `situ exec` over the
  same backend, all scoped to an explicit local workspace.
- Sparse session setup inputs (objective and research context) and durable
  per-project storage of those inputs.
- The full Situ research record set with session provenance: analyses,
  hypotheses, baselines, experiments, evaluations, measurements, and their
  links, each with an activity timeline using the kinds defined in
  [0019-pull-based-workflow-state](../0019-pull-based-workflow-state/SPEC.md).
  Results, automated trust checks, plans, and interpretations are carried in activity
  bodies and optional payload metadata.
- Artifact references and an internal event timeline.
- Agent-readable project state and agent-requested experiment execution
  through typed harness tools, with managed detached worktrees for
  Scientist experiment tasks and a clean base workspace required before
  candidate execution.
- Workspace state inspection around baseline and candidate measurements
  so dirty starts, changed eval/test files, dependency changes, generated
  files, branch, commit, and eval command are visible when interpreting
  results.
- Pydantic AI `DBOSAgent` as the agent durability boundary, durable
  restart/resume, persisted agent message history, and
  `~/.situ/situ.sqlite` as the canonical product database.
- Simple automated automated trust checks visible to the user and the Manager.

The agent path should express active behavior through approved harness tools.
Getting the project board, creating analyses, creating hypotheses,
creating baselines, creating/running experiments, creating evaluations,
recording measurements, linking hypotheses and experiments, attaching
artifacts, and recording comments should have typed tool envelopes. Situ
persists Pydantic AI message history as the durable project agent
transcript and uses events/collection upserts for live tool-call
observability.

Candidate experiment evidence should be interpreted with workspace state in
view. Before treating a result as comparable to baseline, the agent should know
the starting git state, ending dirty state, eval command, and whether source,
tests/evals, dependencies, or generated files changed. See
[0012-experiment-workspace-state/SPEC.md](../0012-experiment-workspace-state/SPEC.md).

## Out of Scope

- Web UI as the primary surface
- Interactive terminal setup wizard
- Live guidance
- Final report
- Broad health model or health snapshots
- Directions
- Decisions as a standalone top-level model
- Evidence, warnings, findings, or signals as standalone top-level models
- Variant as a first-class model
- Multi-objective workspaces
- Team collaboration
- Cloud sync
- Docker execution
- Parallel experiment batches
- Polyglot worker protocol
- Tauri desktop
- Complex world model
- Generic plugin marketplace
- Remote workers
- Advanced GPU scheduling

## Success Criterion

A user can start a fresh session, watch an agent inspect project/session state,
create or update analyses and hypotheses, establish baseline measurement
evidence, request concrete experiments through the harness, see measurement
evidence, worker results, and automated automated trust checks land in the TUI, and
inspect artifacts when useful. If the user wants to continue an existing
session, they must resume it explicitly.

## Quality Bar

The slice can be narrow, but the live state must be real. Workspaces, projects
with objective/context, sessions, analyses, hypotheses, experiments,
baselines, evaluations, measurements, coordination records, activities,
artifacts, and internal events should survive process restart.
