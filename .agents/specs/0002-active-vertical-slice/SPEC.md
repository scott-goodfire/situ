# Active Vertical Slice

## Purpose

The current slice should prove one experience:

> I start an autoresearch session in the terminal and can see the objective,
> active hypotheses, experiments, activity, artifacts, and internal events as the
> loop runs.

The slice should support one local workspace, project-scoped objective and
research context, a few analyses, a few hypotheses, a sequential
agent-requested experiment loop, comment activities, simple automated trust
concerns, and one worker path.

## Target User Story

A user runs from the repo they want to observe:

```bash
situ start
```

or points Situ at a workspace explicitly:

```bash
situ start ~/sandbox/some-project
```

For the current implementation slice, Situ accepts setup context through
sparse start/exec inputs and reasonable defaults. The durable inputs are:

- Objective
- Research context: how progress is judged, what evals/tools/metrics/logs or
  artifacts matter, and what kinds of experiments are in scope

Then Situ:

- Creates local private project state.
- Starts a new session by default.
- Stores the objective and research context on the attached project.
- Starts a DBOS-backed Pydantic AI agent.
- Lets the agent inspect project and session state, record durable analyses,
  and create hypotheses when useful.
- Requires the agent to establish baseline evaluation evidence before treating
  candidate experiments as comparable.
- Lets the agent call harness tools to run concrete experiments.
- Records evaluation evidence, experiment results, concerns, interpretations,
  and decisions as activities.
- Renders a live terminal dashboard.

The Situ install/dev root and the researched workspace are separate
concepts. Runtime state, project identity, worker current directory, and trust
checks are scoped to the researched workspace, even when the TUI and harness
code are launched from the Situ repository.

## Current Slice Includes

- One-command start
- Explicit workspace argument for sandbox/project testing
- Sparse session setup inputs through objective/context
- Local/private project context
- Project-scoped objective and research context
- Internal project ledger with session provenance
- Analysis ledger
- Hypothesis ledger
- Experiment ledger
- Evaluation ledger
- Many-to-many hypothesis/experiment links
- Analysis activity timeline
- Hypothesis activity timeline
- Experiment activity timeline
- Evaluation activity timeline
- Agent message history ledger
- Comment activities, with results, concerns, plans, and interpretations carried
  in activity bodies and optional payload metadata
- Minimal artifact references when useful
- Simple automated trust concerns
- TypeScript Ink TUI
- Internal event timeline
- Agent-readable status and context
- Agent-requested experiment execution through a typed harness tool
- Workspace state inspection around baseline and candidate measurements, so
  dirty starts, changed eval/test files, dependency changes, generated files,
  branch, commit, and eval command are visible when interpreting results
- Pydantic AI `DBOSAgent` as the agent durability boundary
- Durable restart/resume
- SQLite source of truth

The agent path should express active behavior through approved harness tools.
Getting project/session context, creating analyses, creating hypotheses,
creating/running experiments, creating evaluations, linking hypotheses and
experiments, attaching artifacts, and recording comments should have typed tool
envelopes. Situ should persist Pydantic AI message history as the durable
project agent transcript and use events/collection upserts for live tool-call
observability rather than making a separate tool-call table the source of
truth.

Candidate experiment evidence should be interpreted with workspace state in
view. Before treating a result as comparable to baseline, the agent should know
the starting git state, ending dirty state, eval command, and whether source,
tests/evals, dependencies, or generated files changed. See
[0012-experiment-workspace-state/SPEC.md](../0012-experiment-workspace-state/SPEC.md).

## Deferred

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
create or update analyses and hypotheses, establish baseline evaluation
evidence, request concrete experiments through the harness, see evaluation
evidence, worker results, and automated concern comments land in the TUI, and
inspect artifacts when useful. If the user wants to continue an existing
session, they must resume it explicitly.

## Quality Bar

The slice can be narrow, but the live state must be real. Workspaces, projects
with objective/context, sessions, analyses, hypotheses, experiments,
evaluations, coordination records, activities, artifacts, and internal events
should survive process restart.
