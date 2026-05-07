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
- What baselines and baseline measurements exist?
- What measurements came back for candidate experiments?
- Which experiments relate to which hypotheses?
- What result comments came back?
- What concern comments apply?
- Which candidate experiments have Critic reviews?
- Are there experiments with recorded evidence that are still pending review?
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

Defer richer guidance and proposal-context commands until the basic loop is
working. Agent-facing toolsets may expose explicit `list_*` tools for
first-class research records when those tools make state inspection clearer
than requiring agents to fetch the full project board.

## Project Board

The compact project board, exposed to agents through `get_project_board`,
should include:

- Project objective
- Project research context
- Current run status when useful
- Active hypotheses
- Recent experiments
- Recent evaluations
- Recent measurements
- Hypothesis/experiment links
- Recent hypothesis activities
- Recent experiment activities
- Recent measurement evidence
- Recent Critic reviews and pending review tasks
- Recent concern/result/decision comments
- Artifact references
- Internal events when useful

Agent-facing read and write tools should stay close to the product models.
Use `get_project_board` for the compact current board, and use explicit `list_*`
tools when an agent needs a focused slice such as hypotheses, baselines,
experiments, evaluations, measurements, activities, or artifacts.

Agent-facing write tools should stay close to the product models:
`create_hypothesis`, `update_hypothesis`, `create_baseline`,
`create_experiment`, `update_experiment`, `create_evaluation`,
`update_evaluation`, `link_hypothesis_experiment`, `add_hypothesis_comment`,
`add_experiment_comment`, an experiment-review-shaped tool when Critic review
is active, and a result- or measurement-shaped evidence tool.
Analysis, hypothesis, experiment, and task collaboration is stored through
comment-shaped activities. Measurement evidence carries human-readable result
text plus optional payload metadata when a view or agent needs structured
metrics, raw evidence, or interpretation details.

Workspace interaction should come from a separate console toolset backed by the
current repo path. The first slice should expose ordinary coding-agent tools
such as `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`, and
`execute`. Agents use those tools to inspect the project and run native
commands described in `--context`.

Command output should be preserved as plaintext evidence. Situ should not
deterministically parse arbitrary stdout into metrics or signals in the tool
layer. If output matters, the agent records the raw text or an LLM-written
interpretation through the measurement evidence tool, linked back to the
evaluation subject. Experiment comments should explain the attempted change and
the research implication rather than acting as the raw benchmark log.

## Product Rule

Situ owns durable research context. Agent prompts can be creative, but they
should not be the only place where the research contract lives.

Agents should treat the current project board as the working truth. Older runs
are reference material until their findings are copied, summarized, or resumed
explicitly.
