# Product Primitives

Use simple product nouns. For the first slice, keep the domain intentionally
small.

## MVP Hierarchy

```text
Goal
  |-- Runs
  |     |-- Experiments
  |     `-- Events
  |-- Current Best Valid Result
  `-- Warnings
```

## Goal

The durable north star. It defines what the research is trying to improve or
understand.

A first goal needs only: goal text, eval command, primary metric key, metric
direction, and optional forbidden paths.

## Experiment

One concrete attempt: a change, probe, eval run, analysis, or test.

An experiment should record:

- Hypothesis
- Direction
- Method or change summary
- Status
- Primary metric value
- Metric delta from baseline or previous best
- Suspicious flag and reason
- Short note
- Minimal log/artifact references if available

## Event

A timestamped record of what happened during the run.

Events power the TUI timeline. They should be concise enough to scan.

## Current Best Valid Result

The best completed, non-suspicious experiment according to the primary metric.

This is the central computed value in the first slice. It proves that "best raw
metric" and "best valid result" are different.

## Warning

A live observability note that something may be invalid or needs attention.

Examples:

- Eval command failed.
- Primary metric missing.
- Primary metric was not numeric.
- Forbidden path changed.

## Deferred Primitives

These remain important product concepts, but are not part of the first
implementation slice:

- Direction
- Finding
- Decision
- Report
- Broad health model
