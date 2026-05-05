# Milestones

This doc captures execution context for the current phase. It is not the product
contract; specs remain the contract.

## Milestone 1: Autoresearch Harness MVP

Build a basic local terminal observability harness for autoresearch sessions.

The MVP should demonstrate that a user can start a session and see:

- What is running now
- Which objective is active
- Which hypotheses are being explored
- What experiments have completed
- What result activities came back
- What concern and interpretation activities were recorded
- What artifacts can be inspected
- What automated trust checks fired

The first slice should stay TUI-only and local-first.

## Problems To Address

### Specification Gaming

Autoresearch loops can improve measured results for invalid reasons.

Examples:

- Changing eval code
- Changing validation data
- Changing sample counts
- Changing random seeds until one looks good
- Reporting malformed or incomplete metrics

The MVP should surface suspicious results as concern activities rather than
blindly treating metric movement as progress.

### Local Optima

Greedy hill-climbing can get stuck early.

The harness should preserve experiment activities and hypothesis context, not
only a single best score. This lets the user see ideas that were weak alone but
promising in combination.

### Poor Visibility

Long-running loops are hard to watch live.

The TUI should make the session legible without reading raw logs.

### Poor Legibility

Hundreds of experiments can become unusable output.

The first answer is not a final report. The first answer is a live, structured
view of objectives, hypotheses, experiments, activities, artifacts, and events.

## Milestone 2: Karpathy Autoresearch Benchmark

Use Karpathy-style autoresearch as the first failure-mode benchmark.

The benchmark target is useful because it is intentionally constrained:

- A small autonomous experiment loop
- One editable training file
- Fixed-time experiments
- A simple metric-oriented keep/discard loop

The harness should first replicate the baseline behavior, then demonstrate how
the observability and trust layer helps expose failure modes.

Failure modes to probe:

- Seed hacking
- Eval or validation data tampering
- Metric shape drift
- Greedy local optimum behavior
- Log overload and poor legibility

The goal is not to criticize that repo. The goal is to use a clear autoresearch
loop as a concrete benchmark for this harness.
