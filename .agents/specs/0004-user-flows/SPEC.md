# User Flows

## Default Start

```text
User runs `almanac start`
  |
  |-- Existing local context?
  |     |-- yes -> open TUI and resume/show current state
  |     `-- no  -> show slim terminal setup
  |
  `-- Almanac creates/resumes local run state
```

The default flow should be one command, not a pile of advanced subcommands.

## Terminal Setup

The setup flow should ask only:

- Goal
- How do you currently judge progress?
- What evals, tools, metrics, dashboards, logs, or artifacts matter?
- What kinds of experiments are in scope?

The setup should accept ambiguous plaintext. Almanac can structure it into an
evaluation context and signals over time.

After setup, Almanac should record or run baseline evidence when available and
render the TUI dashboard.

## Running Flow

```text
Baseline evidence
  -> first experiment
  -> collect evidence/signals
  -> automated trust checks
  -> finding update
  -> next proposal round
```

The default loop should be sequential for the MVP. Parallel batches can come
later after live observability and basic suspicious-result handling are
reliable.

## Suspicious Evidence Flow

When evidence looks invalid or untrustworthy:

```text
Experiment result arrives
  -> evidence parsed
  -> automated trust checks run
  -> mark evidence or experiment suspicious
  -> keep it in the ledger
  -> do not use it as support for findings unless resolved
  -> show warning in TUI
```

Suspicious evidence is a core product moment, not an edge case.
