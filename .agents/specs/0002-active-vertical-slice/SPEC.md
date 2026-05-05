# Active Vertical Slice

## Purpose

The current slice should prove one experience:

> I start an autoresearch session in the terminal and can see the objective,
> active hypotheses, experiments, activity, artifacts, and internal events as the
> loop runs.

The slice should support one local project, one active objective, lightweight
research context, a few hypotheses, a sequential agent-requested experiment
loop, comment activities, simple automated trust concerns, and one worker path.

## Target User Story

A user runs from the repo they want to observe:

```bash
almanac start
```

or points Almanac at a workspace explicitly:

```bash
almanac start ~/sandbox/some-project
```

If no local research context exists for the current project, Almanac shows a
slim terminal setup flow. It asks only:

- Objective
- How do you currently judge progress?
- What evals, tools, metrics, dashboards, logs, or artifacts matter?
- What kinds of experiments are in scope?

Then Almanac:

- Creates local private project state.
- Creates or reuses the active objective.
- Starts a local session.
- Starts a DBOS-backed Pydantic AI agent.
- Lets the agent inspect session state and create hypotheses when useful.
- Lets the agent call harness tools to run concrete experiments.
- Records results, concerns, interpretations, and decisions as activities.
- Renders a live terminal dashboard.

The Almanac install/dev root and the researched workspace are separate
concepts. Runtime state, project identity, worker current directory, and trust
checks are scoped to the researched workspace, even when the TUI and harness
code are launched from the Almanac repository.

## Current Slice Includes

- One-command start
- Explicit workspace argument for sandbox/project testing
- Terminal setup flow
- Local/private project context
- Active objective
- Internal session ledger
- Hypothesis ledger
- Experiment ledger
- Many-to-many hypothesis/experiment links
- Hypothesis activity timeline
- Experiment activity timeline
- Agent message history ledger
- Comment activities, with results, concerns, plans, and interpretations carried
  in activity bodies and optional payload metadata
- Minimal artifact references when useful
- Simple automated trust concerns
- TypeScript Ink TUI
- Internal event timeline
- Agent-readable status and context
- Agent-requested experiment execution through a typed harness tool
- Pydantic AI `DBOSAgent` as the agent durability boundary
- Durable restart/resume
- SQLite source of truth

The agent path should express active behavior through approved harness tools.
Getting session context, creating hypotheses, creating/running experiments,
linking hypotheses and experiments, attaching artifacts, and recording comments
should have typed tool envelopes. Almanac should persist Pydantic AI message
history as the durable agent transcript and use events/collection upserts for
live tool-call observability rather than making a separate tool-call table the
source of truth.

## Deferred

- Web UI as the primary surface
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

A user can start a session, watch an agent inspect state, create or update
hypotheses, request concrete experiments through the harness, see worker results
and automated concern comments land in the TUI, and inspect artifacts when
useful.

## Quality Bar

The slice can be narrow, but the live state must be real. Objectives, sessions,
hypotheses, experiments, activities, artifacts, and internal events should
survive process restart.
