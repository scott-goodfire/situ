# Agent-Facing Context

Almanac should be useful to agents as well as humans.

Agents should not have to infer durable research state from an ever-growing chat
transcript. Almanac should expose compact, current, machine-readable context.

## Agent Questions

An agent should be able to ask:

- What is the current objective?
- What research context is relevant?
- Which hypotheses are open or active?
- What has already been tried?
- Which experiments relate to which hypotheses?
- What result comments came back?
- What concern comments apply?
- What artifacts can be inspected?
- What is running now?

## Candidate CLI/API Surface

The exact interface can evolve, but the slim headless surface should start with
commands that agents can run without a TTY:

```bash
almanac exec --json
almanac status --json
almanac snapshot --json
almanac events --json
almanac wait --json
```

`exec` may start and own a temporary local session. `status`, `snapshot`,
`events`, and `wait` should attach to existing local state or a live local
session instead of rendering the TUI.

Headless output should be machine-readable by default:

- JSON for status, snapshots, and final summaries.
- JSON Lines for event streams and long-running `exec` output.
- Human progress and diagnostics on stderr, not mixed into stdout.

Keep the first flags sparse: workspace, setup context, max experiments, and
timeout are enough until the agent workflow proves it needs more.

Defer richer guidance, proposal-context commands, and broad object-specific
list commands until the basic loop is working.

## Session Context

The compact session context, exposed to agents through tools such as
`get_session`, should include:

- Objective
- Research context
- Current session status
- Active hypotheses
- Recent experiments
- Hypothesis/experiment links
- Recent hypothesis activities
- Recent experiment activities
- Recent concern/result/decision comments
- Artifact references
- Internal events when useful

Agent-facing write tools should stay close to the product models:
`create_hypothesis`, `update_hypothesis`, `create_experiment`,
`update_experiment`, `link_hypothesis_experiment`,
`add_hypothesis_comment`, and `add_experiment_comment`. Comments are stored as
`kind="comment"` activities internally, with optional payload metadata when a
view or agent needs to distinguish results, concerns, plans, or interpretations.

## Product Rule

Almanac owns durable research context. Agent prompts can be creative, but they
should not be the only place where the research contract lives.
