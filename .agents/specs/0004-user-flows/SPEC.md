# User Flows

## Default Start

```text
User runs `almanac start`
  |
  |-- Existing local context?
  |     |-- yes -> open TUI and resume/show current state
  |     `-- no  -> show slim terminal setup
  |
  `-- Almanac creates/resumes objective and starts a local session
```

The default flow should be one command, not a pile of advanced subcommands.

## Terminal Setup

The setup flow should ask only:

- Objective
- How do you currently judge progress?
- What evals, tools, metrics, dashboards, logs, or artifacts matter?
- What kinds of experiments are in scope?

The setup should accept ambiguous plaintext. Almanac can structure it into an
evaluation context, hypotheses, experiments, activities, and artifacts over time.

After setup, Almanac should create an active objective and render the TUI
dashboard.

## Running Flow

```text
Objective
  -> session starts
  -> hypothesis is created or selected
  -> experiment is created and linked to one or more hypotheses
  -> worker runs experiment
  -> result activity is recorded
  -> automated trust checks record concern activity when needed
  -> interpretation/update activity feeds the next proposal round
```

The default loop should be sequential for the MVP. Parallel batches can come
later after live observability and basic suspicious-result handling are
reliable.

## Suspicious Result Flow

When a result looks invalid or untrustworthy:

```text
Experiment result arrives
  -> result activity is recorded
  -> automated trust checks run
  -> concern activity is recorded
  -> artifact references are preserved
  -> LLM/human interpretation can decide what it means
  -> TUI shows the concern in context
```

Suspicious results are a core product moment, but they should not force a
standalone Warning model. They are experiment activities with clear kinds and
human-readable bodies.
