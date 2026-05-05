# User Flows

## Default Start

```text
User runs `situ start`
  |
  |-- Existing local project context?
  |     |-- yes -> open TUI preflight
  |     `-- no  -> use supplied objective/context or sparse defaults, then open TUI preflight
  |
  |-- User chooses Start session?
  |     |-- yes -> create a fresh session with objective/context
  |     `-- no  -> exit without starting research work
  |
  `-- TUI renders live session observability
```

The default flow should be one command, not a pile of advanced subcommands.
It should not implicitly resume old research state.
Interactive `start` should not auto-run agent work on launch. It may start the
local session server, but `session.start` should wait for the user's explicit
Start selection.

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

After setup input is resolved, Situ should create a new session with its own
objective and research context only after the user confirms the preflight prompt,
then render the TUI dashboard.

## Resume Flow

```text
User runs `situ resume`
  |
  |-- latest session for this project exists?
  |     |-- yes -> resume that session id
  |     `-- no  -> explain that there is no session to resume
```

`resume` means continue the same session id and append to the same ledger.
Starting from prior findings in a new session should be a separate future
`start --from <session-id>` style flow, not implicit resume.

## Attach Flow

```text
User runs `situ attach`
  |
  |-- healthy local session server exists?
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
  -> interpretation comment feeds the next proposal round
```

The default loop should be sequential for the current slice. Parallel batches
can come later after live observability and basic suspicious-result handling are
reliable.

## Suspicious Result Flow

When a result looks invalid or untrustworthy:

```text
Experiment result arrives
  -> result comment is recorded
  -> lightweight trust checks or LLM review flag concerns when available
  -> concern comment is recorded if the evidence looks invalid
  -> artifact references are preserved
  -> LLM/human interpretation can decide what it means
  -> TUI shows the concern in context
```

Suspicious results are a core product moment, but they should not force a
standalone Warning model. They are experiment comment activities with
human-readable bodies and optional payload metadata.
