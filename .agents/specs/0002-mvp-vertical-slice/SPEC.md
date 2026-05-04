# MVP Vertical Slice

## Goal

The MVP should prove one experience:

> I start an autoresearch run in the terminal and can see what is running, what
> changed, what evidence came back, what looks suspicious, and what the run is
> learning.

The slice should support one local project, one goal, a lightweight evaluation
context, multiple possible signals, automated trust warnings, lightweight
findings, and one deterministic worker path.

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

- Goal
- How do you currently judge progress?
- What evals, tools, metrics, dashboards, logs, or artifacts matter?
- What kinds of experiments are in scope?

Then Almanac:

- Creates local private project state.
- Records or runs a baseline when one is available.
- Starts a tiny sequential experiment loop.
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
- Baseline evidence when available
- Sequential experiment loop by default
- One agent/worker path
- Experiment ledger
- Evidence and signal capture
- Lightweight findings
- Automated trust warnings
- TypeScript Ink TUI
- Event timeline
- Promising findings / notable evidence summary
- Agent-readable status and context
- Durable restart/resume
- SQLite source of truth
- Event log
- Minimal artifact/log references only if immediately useful

## MVP Cuts

- Web UI
- Live guidance
- Final report
- Broad health model or health snapshots
- Directions
- Decisions
- Variant as a first-class model
- Multi-goal workspaces
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
evidence accumulate into lightweight findings, and see at least one suspicious
piece of evidence flagged for an obvious automated reason.

## Quality Bar

The MVP can be narrow, but the live state must be real. The run ledger,
experiment evidence, events, findings, and warnings should survive process
restart.
