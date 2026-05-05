# MVP Vertical Slice

## Goal

The MVP should prove one experience:

> I start an autoresearch session in the terminal and can see the objective,
> active hypotheses, experiments, activity, artifacts, and internal events as the
> loop runs.

The slice should support one local project, one active objective, lightweight
evaluation context, a few hypotheses, a sequential experiment loop, typed
activities, simple automated trust concerns, and one deterministic worker path.

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
- Creates initial hypotheses when useful.
- Runs a tiny sequential experiment loop.
- Records results, concerns, interpretations, and decisions as activities.
- Renders a live terminal dashboard.

The Almanac install/dev root and the researched workspace are separate
concepts. Runtime state, project identity, worker current directory, and trust
checks are scoped to the researched workspace, even when the TUI and harness
code are launched from the Almanac repository.

## MVP Includes

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
- Result, concern, comment, update, and decision activities
- Minimal artifact references when useful
- Simple automated trust concerns
- TypeScript Ink TUI
- Internal event timeline
- Agent-readable status and context
- Durable restart/resume
- SQLite source of truth

The agent path should express active behavior through approved harness tools
where practical. The MVP can keep a deterministic outer loop, but actions such
as getting agent context, creating hypotheses, linking experiments, and recording
activities should have typed tool envelopes. Almanac should persist Pydantic AI
message history as the durable agent transcript and use hooks/events for live
tool-call observability rather than making a separate tool-call table the source
of truth.

## MVP Cuts

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

A user can run the toy loop, watch multiple experiments complete in the TUI, see
experiments linked to hypotheses, inspect result/concern/interpretation
activities, and see at least one suspicious result captured as a concern for an
obvious automated reason.

## Quality Bar

The MVP can be narrow, but the live state must be real. Objectives, sessions,
hypotheses, experiments, activities, artifacts, and internal events should
survive process restart.
