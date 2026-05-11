---
name: situ-policy-perf-budgets
description: Use whenever measuring or reasoning about CLI boot time, adding a benchmark, or interpreting bench output. Benchmarks are informational — other policies (correctness, consistency, durability) take precedence.
---

# Perf Budgets

Benchmarks are here to **understand**, not to gate. The primary
question we want to answer cheaply is "how long does the CLI take to
start up for common entry points?" Everything else is secondary.

## Why

We don't have a perf SLA. We do have a slowly-growing CLI surface and
a backend that runs through Bun + drizzle + Hono on every invocation.
Numbers help us spot regressions before they become noticeable —
"`situ --help` went from 80ms to 600ms" is the kind of signal a bench
catches and a vibe check doesn't.

But the moment perf conflicts with another policy, the other policy
wins. Every Situ policy ranks above this one.

## Order of precedence

When a perf finding suggests changing code, check first whether it
conflicts with:

- `situ-policy-timestamps` — `dateTimeModule.nowIso()` is required for consistency
  across rows. It's ~2.5× slower than raw `new Date().toISOString()`.
  This is a documented, accepted cost.
- `situ-policy-mutations-via-runsyncedwrite` — the transaction +
  `syncVersion` bump per mutation has cost. Don't optimize by
  bypassing it.
- `situ-policy-durable-records` — extra writes to activity rows have
  cost. Don't skip them to save microseconds.
- `situ-policy-error-throwing` — structured error messages with id /
  operation context are required. Don't shorten for perf.

If a bench number prompts a code change that would violate any of the
above, the right move is to record the cost as known and move on, not
to break the policy.

## Tools

| Tool          | Use                                                                                                                                                | Output                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **hyperfine** | Time CLI boot end-to-end (`situ --help`, `situ --version`, `situ doctor --json`). Process-startup is what users feel.                              | Wall-clock per invocation, statistical summary across runs. |
| **mitata**    | In-process micro-benchmarks for hot paths (e.g., `dateTimeModule.nowIso()` vs `new Date().toISOString()`). Use when CLI boot timing is too coarse. | Nanosecond-level per-call comparisons.                      |

## Tasks

```bash
mise run bench:cli         # hyperfine — boot times for situ --help / --version / doctor --json
mise run bench:micro       # mitata — in-process micro-benches under projects/app/bench/
```

## Layout

```text
projects/app/bench/
├── index.ts           # mitata entry — imports every *.bench.ts
└── <topic>.bench.ts   # one mitata `group` per topic
```

CLI bench commands are configured directly in `mise.toml` under
`bench:cli` — change the command list there when adding a new entry
point worth timing.

## Rules

- Benchmarks are informational. They don't appear in `mise run check`,
  pre-commit, or pre-push. Run them on demand.
- New CLI entry points worth timing get added to `mise run bench:cli`'s
  hyperfine command list.
- Mitata bench files (`*.bench.ts`) stay read-only — no DB writes,
  no fs writes, no network. State is set up in module scope before
  the `bench(...)` call.
- Bench comparisons need a baseline. Single numbers are noise; pairs
  ("ours" vs "the conventional alternative") are signal.
- A bench number doesn't justify breaking another policy. See
  precedence list above.

## Avoid

- Treating `mise run bench:cli` numbers as absolute budgets. CI
  runners and local machines vary; relative comparisons across runs
  on the same machine are the useful signal.
- Adding mitata benches that mutate persistent state — they pollute
  subsequent runs.
- Wiring perf into `mise run check` or pre-commit. Perf signal is
  noisy; gates on noisy signals create churn.
- Optimizing a bench number by removing a `runSyncedWrite`,
  short-circuiting an activity write, or dropping a `dateTimeModule.nowIso()`. The
  policies that mandate those exist for reasons that outrank perf.

## Tools deferred

Today's setup (mitata + hyperfine) covers in-process and CLI-boot.
Categories not yet wired:

- **Memory profiling** — `bun --inspect` + Chrome DevTools is enough
  for ad-hoc; no automation yet.
- **Hot-path tracing in production** — Fallow's runtime layer (paid)
  would tell us which code paths actually run, but we're not paying
  the runtime tier today.

## See also

- `situ-policy-timestamps` — perf precedence example
- `situ-policy-mutations-via-runsyncedwrite` — the hot path that
  perf is most tempted to compromise
- `situ-policy-durable-records` — second-most-tempted
