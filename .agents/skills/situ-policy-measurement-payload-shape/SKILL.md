---
name: situ-policy-measurement-payload-shape
description: Use whenever recording or reading a measurement payload — record_measurement, record_experiment_comparison, or any code that puts metrics into a measurement payload.
---

# Measurement Payload Shape

A measurement payload may carry metrics from more than one evaluation split. When it does, name the splits so downstream readers (Verifier especially) can cross-check them.

## Why

Many projects evaluate candidates on both a development set (used to decide keep/discard) and a held-out / final set (used as a trust check, not an optimizer). If both numbers are flattened into a single `metrics` object with project-specific keys, downstream agents can't tell which key is which split — and one of the most useful signals available to the loop (dev and held-out moving in opposite directions) is lost.

Naming the splits is the whole fix. It does not turn the held-out metric into an optimization target — it just lets the Verifier read both and reason about disagreement.

## Convention

Opt-in. Use when the project's harness emits more than one split.

- Single-split runs keep the flat shape: `payload.metrics: Record<string, MetricValue>`. No change.
- Multi-split runs nest under split names: `payload.metrics: { dev: { ... }, holdout: { ... } }`. Use `dev` for the split used to drive decisions and `holdout` (or `final`, `test` — pick one per project and be consistent) for the trust-check split.
- The split names are durable across measurements within a project. The Manager states the convention in the project baseline; Scientist follows it; Verifier reads it.
- When held-out isn't available — many projects have no held-out, or only some experiments run it — omit the `holdout` key. Do not invent zeros, do not copy `dev` into `holdout`, do not flag absence as suspicious.

## Why no schema enforcement

The split keys are durable record content, not API contracts. A project may use `dev` / `holdout`, another may use `train_eval` / `val`. Forcing a typed enum across all projects would force every project to use the same names. The skill prompts read the conventions Scientist established, not a global vocabulary.

## Avoid

- Flattening dev and held-out into one `metrics` object with project-specific keys when both are available — downstream readers can't tell which is which.
- Inventing a held-out number when the harness did not produce one (zeros, copies of dev, placeholders).
- Optimizing against the held-out split. It is a trust check, not an objective. Promote it to a target and you lose its value as a cross-check.
- Flipping the dev verdict because held-out disagrees. Divergence is a signal for the Manager to redesign, not a pass/fail override.

## See also

- `situ-policy-json-columns`
- `situ-policy-durable-records`
- `situ-scientist-exploit-task` (records measurement payloads)
- `situ-verifier-verify-task` (reads measurement payloads for cross-check)
