# Autoresearch Reference

This doc captures durable context about Karpathy's autoresearch project.
Situ benchmarks itself against autoresearch as the canonical example of a
research loop that runs unattended. Future agents working in this repo
should know what they are being compared to without leaving the repo.

This doc is reference, not a contract. Specs remain the contract.

## What Autoresearch Is

[karpathy/autoresearch](https://github.com/karpathy/autoresearch) is a
single-GPU autoresearch loop released in March 2026. The thesis: give a
coding agent a small but real ML training setup, let it run experiments
overnight, and let metric-driven keep/discard decisions accumulate
improvement.

The default target is a simplified single-GPU implementation of nanochat.
The metric is `val_bpb` (validation bits per byte) over a fixed 5-minute
training budget per experiment. About 12 experiments per hour, around 100
experiments over a typical sleep cycle.

## Repo Structure

Three files do the work:

- `prepare.py` — read-only. One-time data prep, tokenizer, dataloader,
  evaluation. The agent does not modify it.
- `train.py` — the only file the agent edits. Contains the model, optimizer,
  and training loop. Architecture, hyperparameters, optimizer choice, batch
  size, and model size are all fair game.
- `program.md` — instructions that drive the agent loop. The user iterates
  on this. The agent reads it and follows it.

The supporting files (`pyproject.toml`, `uv.lock`, `analysis.ipynb`,
`progress.png`) are not load-bearing for the loop.

## The Loop

Per `program.md`:

1. Inspect git state.
2. Edit `train.py` with one experimental idea.
3. `git commit`.
4. Run training: `uv run train.py > run.log 2>&1` (5 minutes wall clock).
5. Read `val_bpb` from the log.
6. If `val_bpb` improved, advance the branch. Otherwise reset to the
   previous commit.
7. Append the result row to `results.tsv`.

Three structural choices make this work:

- **Fixed time budget.** Each experiment is 5 minutes regardless of platform.
  This caps the cost of any single bad idea and keeps experiment throughput
  predictable.
- **Commit-per-experiment.** The git history is the audit trail. Reverting
  is free. Resuming is free. Reviewing is free.
- **NEVER STOP.** `program.md` instructs the agent in all caps to never
  pause to ask the human if it should continue. The human might be asleep.

## How To Run It

The "agent" is a local coding agent (Claude Code, Codex, or similar).
There is no separate scheduler binary.

Setup once:

```bash
git clone https://github.com/karpathy/autoresearch
cd autoresearch
uv sync
uv run prepare.py    # downloads data, trains tokenizer (~2 min)
```

Verify a single training run works:

```bash
uv run train.py
```

Then start the agent in the same directory and prompt:

> Hi, have a look at program.md and let's kick off a new experiment! Let's
> do the setup first.

The agent proposes a tag (e.g. `mar5`), creates branch
`autoresearch/<tag>`, runs the baseline as the first row of `results.tsv`,
then enters the loop.

## Model Recommendation

- **Claude Opus 4.6** is what Karpathy uses, and what published reports
  benchmark with. It respects the "NEVER STOP" directive and runs for many
  hours unattended.
- **Codex** does not currently respect the directive. Reports say it ends
  the session early. See
  [issue #57](https://github.com/karpathy/autoresearch/issues/57).
- **Sonnet** works for shorter runs but is less reliable for long
  autonomous loops.
- **Opus 4.7 (1M context)** is at least as capable and helpful when the
  run log grows large.

## Why Situ Cares

Autoresearch's loop is a clean test target for Situ:

- Small editable surface (one file).
- Fixed-time experiments (predictable cost).
- A single primary metric (clear keep/discard rule).
- An agent loop that does not pause for human input.

Situ does not replace autoresearch. Situ runs alongside it, observing the
same loop and surfacing when metric movement is suspicious. For example:
when a candidate changed the eval harness, when a result is within
run-to-run noise, or when the change is dev-set-informed in a way that
does not generalize.

The reference comparison is **same starting state, same metric, two
harnesses**. Karpathy-style autoresearch optimizes for metric movement.
Situ optimizes for trustworthy metric movement.

See [`failure-modes/DOC.md`](../failure-modes/DOC.md) for the catalog of
failure modes Situ targets, and [`milestones/DOC.md`](../milestones/DOC.md)
for the current execution context.

## Sources

- [karpathy/autoresearch](https://github.com/karpathy/autoresearch)
- [Issue #57: Codex doesn't seem to work](https://github.com/karpathy/autoresearch/issues/57)
- [DataCamp guide to AutoResearch](https://www.datacamp.com/tutorial/guide-to-autoresearch)
