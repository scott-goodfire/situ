---
name: situ-policy-durable-records
description: Use whenever an agent persists work outputs (hypotheses, baselines, experiments, evaluations, measurements, artifacts, entity links, comments, task completions) or reviewing whether evidence is durable.
---

# Durable Records

Preserve inspectable state, not chat prose.

## Why

Situ's value is the inspectable record left behind, not the chat transcript. If agent work doesn't write durable records, future runs (and humans) lose the context needed to build on it. A "completed" task with no result summary is indistinguishable from no work at all.

## Rules

- Mutating helpers update `syncVersion` and notify sync (covered mechanically by `situ-policy-mutations-via-runsyncedwrite`).
- Agent work completes or fails the active task exactly once.
  `task-repository.complete` and `.fail` enforce this via `assertNotTerminal`.
- Research work writes hypotheses, artifacts, or entity links when it produces reusable knowledge.
- Scientist work writes baselines, experiments, evaluations, measurements, artifacts, or entity links when it produces evidence.
- Exploration ResearchTasks may create hypotheses as their durable output.
  Candidate Experiments must identify one primary hypothesis through the
  Experiment record; use generic entity links only for secondary relationships.
- Verifier decisions record a ResearchTaskVerification with a short judgment
  and evidence summary. They do not mutate hypothesis lifecycle state.

## Avoid

- A completed task with no durable output or meaningful result summary.
- Evidence that lives only in assistant text.
- A mutation that bypasses sync notification.

## See also

- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-status-record-transitions`
