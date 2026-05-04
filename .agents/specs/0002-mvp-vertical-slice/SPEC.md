# MVP Vertical Slice

## Goal

The MVP should prove one experience:

> I start an autoresearch run in the terminal and can see what is running, what
> changed, what the eval said, what looks suspicious, and what the current best
> valid result is.

The slice should support one local project, one goal, one eval command, one
primary metric, very slim guardrails, and one deterministic worker path.

## Target User Story

A user runs:

```bash
almanac start
```

If no local research context exists for the current project, Almanac shows a
slim terminal setup flow. It asks only:

- Goal
- Eval command
- Primary metric key
- Metric direction: maximize or minimize
- Optional forbidden paths

Then Almanac:

- Creates local private project state.
- Runs a baseline.
- Starts a tiny sequential experiment loop.
- Renders a live terminal dashboard.

## MVP Includes

- One-command start
- Terminal setup flow
- Local/private project context
- Baseline run
- Sequential experiment loop by default
- One agent/worker path
- Experiment ledger
- Very slim guardrail checks
- TypeScript Ink TUI
- Event timeline
- Current best valid result
- Basic suspicious-result warnings
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
- Findings
- Decisions
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
the current best valid result update, and see at least one suspicious result get
excluded for an obvious reason.

## Quality Bar

The MVP can be narrow, but the live state must be real. The run ledger,
experiment results, events, current best valid result, and suspicious warnings
should survive process restart.
