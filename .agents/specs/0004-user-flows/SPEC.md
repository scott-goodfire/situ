# User Flows

## Default App And TUI Start

```text
User runs `situ app`
  |
  `-- app server starts and waits without creating a session

User runs `situ tui`
  |
  |-- TUI connects to app and shows a brief fullscreen loading state
  |
  |-- Explicit objective/context supplied?
  |     |-- yes -> show final start confirmation
  |     `-- no  -> show fullscreen onboarding questions
  |
  |-- User confirms final start
  |     `-- create a fresh project and attached session
  |
  `-- TUI renders live session observability
```

The default runtime flow is two terminals: one app process for all sessions and
one TUI client for the selected workspace. The TUI should not implicitly resume
old research state or reuse an old project. The primary surface is `situ app`
plus `situ tui`; there is no `situ start` compatibility command.

Opening interactive `situ tui` should not immediately begin agent work when the
user has not provided setup inputs. It should enter the fullscreen terminal
surface, gather lightweight onboarding answers when needed, and only call
`session.start` after final confirmation. CLI-provided objective/context may
skip onboarding, while the final start confirmation remains part of the
interactive TUI flow.

## Setup Inputs

The first implementation should keep setup as sparse plaintext inputs:

- Objective
- Research context: how progress is judged, what evals, tools, metrics,
  dashboards, logs, or artifacts matter, and what kinds of experiments are in
  scope

The setup should accept ambiguous plaintext. Situ can preserve it as
session research context and structure it into hypotheses, experiments,
activities, and artifacts over time.

The headless setup shape should match the product nouns:

```bash
situ exec . \
  --objective "Improve the target behavior without breaking correctness." \
  --context "Run make eval from the repo root. It prints score, accuracy, loss, runtime_ms, and tests_passed. Higher score and accuracy are better; lower loss and runtime are better. Failed checks invalidate the result."
```

`--context` is intentionally broad. It may include how to run the project,
which outputs matter, how to read ordinary command output, and what should be
considered suspicious.

After setup input is resolved and the user confirms final start, Situ should
create a new project carrying the objective and research context, create a new
session attached to that project, then render the TUI dashboard.

## Resume Flow

```text
User runs `situ tui --resume <session-id>` or `situ resume`
  |
  |-- requested or latest session exists?
  |     |-- yes -> show final resume confirmation
  |     `-- no  -> explain that there is no session to resume
  |
  |-- User confirms final resume
  |     `-- resume the selected session id
```

`resume` means continue the same session id and append to the same project state.
Starting from prior findings in a new session should be a separate future
`tui --from <session-id>` style flow, not implicit resume.

## Running Flow

```text
Session objective
  -> session starts
  -> baseline evidence exists
  -> analyses and hypotheses are created or selected
  -> Critic accepts usable hypotheses
  -> Manager files a hypothesis-backed Scientist experiment task
  -> experiment is created and linked to one or more hypotheses
  -> agent runs project-native commands with workspace tools
  -> plaintext command evidence is recorded as a result comment
  -> the Critic reviews autonomously when the experiment enters `in_review`,
     completing or canceling the experiment with a comment explaining the judgment
  -> interpretation comment feeds the next proposal round
```

The default loop is sequential. Parallel batches are out of scope until
live observability and basic suspicious-result handling are reliable.

The Manager should not treat a candidate experiment as decision-grade merely
because its command output was recorded. The Critic operates autonomously and
acts on experiments via transition tools (`complete_experiment` /
`cancel_experiment`) before the next Manager planning task; its judgment
attaches to the experiment as a `status_updated` activity plus comment.

## Suspicious Result Flow

When a result looks invalid or untrustworthy:

```text
Experiment result arrives
  -> result comment is recorded
  -> lightweight trust checks may flag concerns in command output
  -> Critic reviews whether the proposed change earned its evidence
  -> if the evidence looks invalid, the Critic calls cancel_experiment with a
     comment that explains
  -> artifact references are preserved
  -> the TUI shows the cancellation status and the explanation comment
```

Suspicious results are a core product moment. The cancellation status plus its
comment carry the verdict and reasoning; there is no separate Warning,
Finding, or trust_finding record.
