# Agent-Facing Context

Situ should be useful to agents as well as humans.

Agents should not have to infer durable research state from an ever-growing chat
transcript. Situ should expose compact, current, machine-readable context.

## Agent Questions

An agent should be able to ask:

- What is the current objective?
- What research context is relevant?
- Which hypotheses are open or active?
- What has already been tried?
- What baseline evaluations exist?
- What evaluation evidence came back for candidate experiments?
- Which experiments relate to which hypotheses?
- What result comments came back?
- What concern comments apply?
- What artifacts can be inspected?
- What is running now?

## Candidate CLI/API Surface

The exact interface can evolve, but the slim headless surface should start with
commands that agents can run without a TTY:

```bash
situ exec --objective "..." --context "..." --json
situ status --json
situ snapshot --json
situ events --json
situ wait --json
situ clear --json
```

`exec` may start and own a temporary local session. `status`, `snapshot`,
`events`, and `wait` should attach to existing local state or a live local
session instead of rendering the TUI. `clear` should remove the local Situ
state for one workspace so humans and agents can retry setup from a clean
project context. If a live local harness is active, `clear` should refuse by
default and require an explicit force option before terminating it.

Headless output should be machine-readable by default:

- JSON for status, snapshots, and final summaries.
- JSON Lines for event streams.
- A final JSON summary for `exec`, with progress and diagnostics on stderr.
- A JSON result for `clear`, including workspace, project id, state path, and
  whether anything was removed.
- Human progress and diagnostics on stderr, not mixed into stdout.

Keep the first setup flags sparse:

- `--objective` names the durable goal.
- `--context` explains how the project is normally evaluated, which commands
  matter, what output means, and what should be treated as invalid.

Do not split first-slice setup into `--eval`, `--signals`, or repeated signal
flags. Situ should preserve ambiguous project context and structure it over
time.

Defer richer guidance, proposal-context commands, and broad object-specific
list commands until the basic loop is working.

## Session Context

The compact session context, exposed to agents through tools such as
`get_session`, should include:

- Session objective
- Session research context
- Current session status
- Active hypotheses
- Recent experiments
- Recent evaluations
- Hypothesis/experiment links
- Recent hypothesis activities
- Recent experiment activities
- Recent evaluation activities
- Recent concern/result/decision comments
- Artifact references
- Internal events when useful

Agent-facing write tools should stay close to the product models:
`create_hypothesis`, `update_hypothesis`, `create_experiment`,
`update_experiment`, `create_evaluation`, `update_evaluation`,
`link_hypothesis_experiment`, `add_hypothesis_comment`,
`add_experiment_comment`, and `add_evaluation_result`. Comments and evaluation
results are stored as `kind="comment"` activities internally, with optional
payload metadata when a view or agent needs to distinguish results, concerns,
plans, raw evidence, or interpretations.

Workspace interaction should come from a separate console toolset backed by the
current repo path. The first slice should expose ordinary coding-agent tools
such as `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`, and
`execute`. Agents use those tools to inspect the project and run native
commands described in `--context`.

Command output should be preserved as plaintext evidence. Situ should not
deterministically parse arbitrary stdout into metrics or signals in the tool
layer. If output matters, the agent records the raw text or an LLM-written
interpretation through `add_evaluation_result`, linked back to the experiment
being measured when there is one. Experiment comments should explain the
attempted change and the research implication rather than acting as the raw
benchmark log.

## Product Rule

Situ owns durable research context. Agent prompts can be creative, but they
should not be the only place where the research contract lives.

Agents should treat only the selected session as current truth. Older sessions
are reference material until their findings are copied, summarized, or resumed
explicitly.
