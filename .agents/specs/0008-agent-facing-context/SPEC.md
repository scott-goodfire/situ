# Agent-Facing Context

Situ should be useful to agents as well as humans.

Agents should not have to infer durable research state from an ever-growing chat
transcript. Situ should expose compact, current, machine-readable context.
Agents should also not receive hidden expanded project state context when they can
read it explicitly. Role prompts should bootstrap the agent with the smallest
useful assignment context: role, setup text, hard budgets, and record IDs such
as task IDs. The agent should then call explicit tools such as
`get_task(task_id=...)`, `get_project_board`, and focused `list_*` readers to
gather the state it uses.

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
When the harness has already selected a specific record for an agent to work
on, pass the record ID rather than the full record. For example, a Scientist or
Researcher assigned `T444` should be prompted to call
`get_task(task_id="T444")`; the task body, payload, links, dependencies,
and comments should be obtained through that explicit read. This keeps context
acquisition visible in traces and avoids making prompt construction the hidden
source of truth.

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

## Runtime Skills

Runtime agent skills are reusable methods exposed to Situ's own Manager,
Researcher, Scientist, and Critic agents. They are separate from `.agents/skills`,
which are repository-maintenance workflows for developer agents working on
Situ itself. Runtime agent skills live under
`projects/harness/src/situ/harness/agent_skills/`.

Runtime skills should use progressive disclosure: the base role prompt and
toolset list can advertise available skills, but full methodology should be
loaded through an explicit tool call such as `load_skill(skill_name=...)`.
This keeps traces readable and avoids turning every role prompt into a large
manual.

Skills should teach how to perform a kind of work, not replace product records.
For example, a web-research skill can describe source selection and synthesis,
but the durable output still belongs in `Analysis`, task comments,
`Hypothesis`, or other Situ records. Manager and Researcher skills are in
scope for the current slice. Scientist and Critic skills are deferred until
their core tool loops are stable.

Add a runtime skill when a role needs reusable methodology that would otherwise
inflate the role prompt or be repeated across tasks. Do not use runtime skills
for repo-maintenance workflows; those belong in `.agents/skills/`.

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
Agents should read that working truth through tools. Prompt-injected project
board slices are acceptable only as emergency fallback or for tiny bootstrap
facts that are not durable research records.
