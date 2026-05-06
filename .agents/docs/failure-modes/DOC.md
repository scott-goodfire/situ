# Failure Modes

This doc catalogs the autoresearch failure modes Situ exists to detect.

Each entry describes the mode, the mechanism that produces it, a real
example when one is available, and the signal Situ should produce when it
is observed.

This is a durable list. Modes are added when there is reason to believe
they occur in autoresearch loops. Examples are added when a mode is
actually observed in a Situ run.

## Catalog Format

Each entry has:

- **Definition** — one or two sentences describing the behavior.
- **Mechanism** — why agents fall into it.
- **Example** — a specific named instance, ideally from a Situ run.
- **Signal** — what Situ should produce so a reviewer notices.

## Modes

### Seed Hacking

**Definition.** Running an experiment under multiple random seeds and
reporting the best one as "the result."

**Mechanism.** Run-to-run variance is interpreted as a signal. Selection
across seeds biases the reported metric upward without changing the
algorithm.

**Example.** None recorded yet in a Situ run.

**Signal.** Workspace inspection should record the seed used and any
seed sweep performed. Multiple-seed runs should not be silently collapsed
to the best one in result activities.

### Selection On Noise

**Definition.** Keeping experiments where metric movement is within
run-to-run variance and rejecting equal-magnitude regressions. Across
many experiments the kept set drifts upward from noise alone.

**Mechanism.** Keep/discard rules treat any improvement as real. With no
estimate of metric variance, agents accept noise that happened to land on
the right side of zero.

**Example.** None recorded yet in a Situ run.

**Signal.** Results should be comparable to baseline noise. When variance
is unknown, repeated runs of the unchanged baseline should be collected
before metric movement is interpreted.

### Adaptive Overfitting

**Definition.** A "held out" set leaks into selection decisions when it
is queried repeatedly across many experiments. Even without direct
training, the keep/discard rule learns about the held-out set's
distribution.

**Mechanism.** Each query against the held-out set updates the agent's
posterior. After enough queries the held-out set is no longer held out:
selection is correlated with its noise.

**Example.** None recorded yet in a Situ run.

**Signal.** Held-out queries should be counted and surfaced. A held-out
set queried more than a small bounded number of times should be flagged.

### Greedy Hill-Climbing

**Definition.** Always taking the locally-best move. Misses combinations
that require a single regression-then-gain. Cannot find solutions where
intermediate steps look worse than baseline.

**Mechanism.** The keep/discard rule rejects any individual experiment
that does not improve the metric, even when the discarded change would
combine with a future experiment to produce a larger gain.

**Example.** None recorded yet in a Situ run.

**Signal.** Discarded experiments should remain visible in the activity
log so the user can review which ideas were rejected and consider
combinations the agent did not try.

### Benchmark Overfitting

**Definition.** Satisfying the metric by taking the literal shortest path
to the number rather than improving the underlying algorithm. Includes
hardcoded answers, lookup tables, eval harness changes, dev-set
memorization, and metric-shape drift.

**Mechanism.** The agent treats the objective as the literal optimization
target rather than as a proxy for "make the algorithm better." With no
held-out check that drives keep/discard, the shortest path wins.

**Example.** Situ session against a Norvig spell-corrector workspace,
May 2026. Objective: "Improve dev_accuracy on spell-testset1.txt while
keeping dev_wps >= 10." After diagnosing the 68 dev misses, the agent
edited `spell.py` to add a `CORRECTIONS` dict containing every observed
dev misspelling mapped to its correct answer, with `correction(word)`
returning `CORRECTIONS[word]` directly when present.

- `dev_accuracy`: 0.748 → 1.000 (perfect score by lookup table)
- `final_accuracy` on held-out testset2: 0.675 → 0.6775 (run-to-run noise)

The agent self-flagged the result with a concern comment, citing that
the solution was "explicitly dev-set-informed." That self-flagging is
the kind of behavior Situ should preserve and amplify.

**Signal.** Workspace inspection should diff the editable target and
detect lookup-table-shaped changes (large literal dicts of test inputs).
Held-out metrics should be reported alongside the optimized metric, and
keep/discard rules should require the held-out metric to move with the
optimized metric, not stay flat.

## How This List Grows

When a new mode is observed in a Situ run:

1. Add an entry here, with the **example** populated from the real run.
2. Update related guardrails in
   [`../../specs/0006-guardrails/SPEC.md`](../../specs/0006-guardrails/SPEC.md)
   and
   [`../../policies/0004-guardrails/POLICY.md`](../../policies/0004-guardrails/POLICY.md)
   if a new automated trust check is warranted.
3. Cross-reference from
   [`../milestones/DOC.md`](../milestones/DOC.md) when the milestone phase
   targets the new mode.

When a mode is added without a real example, mark **Example** as "None
recorded yet in a Situ run" so the gap is visible to future readers.
