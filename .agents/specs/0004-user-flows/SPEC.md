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
- Eval command
- Primary metric key
- Metric direction: maximize or minimize
- Optional forbidden paths

After setup, Almanac should run the baseline and render the TUI dashboard.

## Running Flow

```text
Baseline
  -> first experiment
  -> evaluate
  -> slim guardrail checks
  -> current best valid result update
  -> next proposal round
```

The default loop should be sequential for the MVP. Parallel batches can come
later after live observability and basic suspicious-result handling are
reliable.

## Suspicious Win Flow

When an experiment improves the metric but violates a slim guardrail:

```text
Experiment result arrives
  -> metric parsed
  -> guardrail checked
  -> mark experiment suspicious
  -> exclude from best valid result
  -> show warning in TUI
```

Suspicious wins are a core product moment, not an edge case.
