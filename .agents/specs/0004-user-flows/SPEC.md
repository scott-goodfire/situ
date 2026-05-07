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
  |     |-- yes -> create a fresh project and attached session
  |     `-- no  -> show fullscreen onboarding questions
  |
  |-- User confirms onboarding answers
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
surface, gather lightweight onboarding answers, and only call `session.start`
after confirmation. CLI-provided objective/context may skip onboarding for
automation and fast local smoke tests.

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

After setup input is resolved, Situ should create a new project carrying the
objective and research context, create a new session attached to that project,
then render the TUI dashboard.

## Resume Flow

```text
User runs `situ tui --resume <session-id>`
  |
  |-- latest session for this project exists?
  |     |-- yes -> resume that session id
  |     `-- no  -> explain that there is no session to resume
```

`resume` means continue the same session id and append to the same ledger.
Starting from prior findings in a new session should be a separate future
`tui --from <session-id>` style flow, not implicit resume.

## Attach Flow

```text
User runs `situ tui --attach`
  |
  |-- healthy local app and active session exist?
  |     |-- yes -> open TUI against the active live process
  |     `-- no  -> show "no active session found"
```

`attach` reconnects to a running process. It must not create a new session and
must not resume a closed session.

## Running Flow

```text
Session objective
  -> session starts
  -> hypothesis is created or selected
  -> experiment is created and linked to one or more hypotheses
  -> agent runs project-native commands with workspace tools
  -> plaintext command evidence is recorded as a result comment
  -> lightweight trust or validity concerns are recorded when available
  -> Critic reviews the experiment as a proposed change using the
     evaluation/measurement evidence
  -> interpretation comment feeds the next proposal round
```

The default loop should be sequential for the current slice. Parallel batches
can come later after live observability and basic suspicious-result handling are
reliable.

The Manager should not treat a candidate experiment as decision-grade merely
because its command output was recorded. After a Scientist experiment task
completes, Situ should enqueue a review task for the Critic before the next
Manager planning task. The Critic review is experiment-level: it references
evaluations and measurements as evidence, but the user-facing judgment attaches
to the experiment.

## Suspicious Result Flow

When a result looks invalid or untrustworthy:

```text
Experiment result arrives
  -> result comment is recorded
  -> lightweight trust checks or LLM review flag concerns when available
  -> Critic review checks whether the proposed change earned its evidence
  -> concern comment is recorded if the evidence looks invalid
  -> artifact references are preserved
  -> LLM/human interpretation can decide what it means
  -> TUI shows the concern in context
```

Suspicious results are a core product moment, but they should not force a
standalone Warning model. They are experiment comment activities with
human-readable bodies and optional payload metadata.
