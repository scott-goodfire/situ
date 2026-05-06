# Milestones

This doc captures execution context for the current phase. It is not the product
contract; specs remain the contract.

## Milestone 1: Agentic Autoresearch Harness

Build a basic local terminal observability harness for autoresearch sessions.

The current slice should demonstrate that a user can start a session and see:

- What is running now
- Which objective is active
- Which hypotheses are being explored
- What experiments have completed
- What result comments came back
- What concern and interpretation comments were recorded
- What artifacts can be inspected
- What automated trust checks fired

The first slice should stay TUI-only and local-first.

## Problems To Address

Situ targets two layers of problems.

### Autoresearch Failure Modes

The durable catalog of research-loop failure modes lives in
[../failure-modes/DOC.md](../failure-modes/DOC.md). The first slice should
focus on detecting:

- Benchmark overfitting (eval changes, lookup tables, dev-set memorization)
- Greedy hill-climbing (local optima)
- Seed hacking
- Selection on noise

Adaptive overfitting is not a first-slice detection target but should not
be made worse by the harness design.

The current slice should surface suspicious results as concern comments
rather than blindly treating metric movement as progress.

### Observability Problems

These are about the user experience of running an autoresearch loop, not
about how the loop itself fails.

#### Poor Visibility

Long-running loops are hard to watch live.

The TUI should make the session legible without reading raw logs.

#### Poor Legibility

Hundreds of experiments can become unusable output.

The first answer is not a final report. The first answer is a live,
structured view of the project objective, hypotheses, experiments,
activities, artifacts, and events.

## Milestone 2: Karpathy Autoresearch Benchmark

Use Karpathy-style autoresearch as the first failure-mode benchmark. See
[../autoresearch-reference/DOC.md](../autoresearch-reference/DOC.md) for
the canonical autoresearch project Situ benchmarks against.

The benchmark target is useful because it is intentionally constrained:

- A small autonomous experiment loop
- One editable training file
- Fixed-time experiments
- A simple metric-oriented keep/discard loop

The harness should first replicate the baseline behavior, then demonstrate
how the observability and trust layer helps expose failure modes from
[../failure-modes/DOC.md](../failure-modes/DOC.md), particularly:

- Seed hacking
- Selection on noise
- Greedy hill-climbing
- Benchmark overfitting

The goal is not to criticize that repo. The goal is to use a clear
autoresearch loop as a concrete benchmark for this harness.
