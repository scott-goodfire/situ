# Spelling Corrector — Research Objective

This research project pursues continuous improvement to Norvig's spelling
corrector. The Manager, Scientist, and Verifier roles cooperate on an
experiment loop that edits `spell.py`, runs the eval harness, and keeps
or discards changes based on the metric. See `program.md` in this
directory for the original autoresearch program statement — this
objective adapts it to a Situ run.

## Working directory

The source workspace for this run is **`<LAB_DIR>`** — the laboratory
skill substitutes this placeholder before launch, so by the time you
read this it is an absolute path under `~/.situ/laboratory/`. Treat
that directory as the scope of the run. Do not list
`~/.situ/laboratory/` to guess which lab dir is yours — the path above
is authoritative. Do not push, do not touch the operator's other
repositories, and do not assume any state outside this run.

Read-only workspace commands resolve relative paths like `harness.py`
and `spell.py` in the lab dir. Candidate experiment commands are
different: after you create an Experiment and call
`run_workspace_command` with that experiment id, Situ may run the
command in an isolated per-experiment worktree under
`~/.situ/sessions/<session-id>/worktrees/<experiment-id>/`. That is
expected. Make `spell.py` edits, harness invocations, `git commit`,
and `git reset --hard HEAD~1` calls in the cwd provided by the command
tool. Do not try to force the lab dir branch to match the experiment
worktree.

The laboratory runner provides `SITU_RUN_OUTPUT_DIR`, a directory outside
the checkout for run logs and result tables. Put command output there.
Do not create `results.tsv`, `run.log`, or other scratch/output files in
the project root or experiment worktree root.

## Scope

- Edit `spell.py` only. Add helper files (corpora, lookup tables,
  precomputed indexes) freely.
- Do NOT modify `harness.py`, `spell-testset1.txt`, or
  `spell-testset2.txt`. These are the eval ground truth.
- Do NOT use `spell-testset1.txt` as training data. The dev set is
  for harness scoring only; candidate code and helper files must not
  read, copy, encode, lookup, or reweight its right-column labels.
- Do NOT read `spell-testset2.txt`. It is held out — reading it for
  ideas invalidates the run.
- Do NOT add Python dependencies outside the standard library.

## Pre-authorizations

The following operations are explicitly authorized within the current
workspace-command cwd and are part of the experiment loop:

- `git commit -am "<short description>"` per experiment.
- `git reset --hard HEAD~1` to discard a failed experiment. This is
  the only acceptable form of destructive git here; do not force-push,
  do not rewrite history beyond the most recent commit.
- `python harness.py > "$SITU_RUN_OUTPUT_DIR/run.log" 2>&1` to run the
  eval. Use the command tool timeout rather than a `timeout` binary.

If you use manual git staging, prefer explicit paths such as
`git add spell.py helper.py` over `git add -A`. Before committing or
capturing a candidate, inspect `git status --short` and remove generated
files such as `__pycache__/` or `*.pyc`; they are not candidate source
changes.

## The loop

For each experiment:

1. Read git state and `$SITU_RUN_OUTPUT_DIR/results.tsv` to see what has
   been tried.
2. Propose a change to `spell.py`. Candidate directions:
   - weighted edit costs (transpositions cheaper than substitutions)
   - Damerau–Levenshtein
   - larger edit distance with better pruning
   - n-gram or character-level context
   - smoothing of word frequencies
   - additional corpora (you may add files but not delete `big.txt`)
   - keyboard-distance scoring
   - common-typo lookup tables
3. `git commit -am "<short description>"`.
4. `python harness.py > "$SITU_RUN_OUTPUT_DIR/run.log" 2>&1`.
5. Parse `dev_accuracy` and `dev_wps` from
   `$SITU_RUN_OUTPUT_DIR/run.log`. If grep is empty, the run crashed —
   `tail -50 "$SITU_RUN_OUTPUT_DIR/run.log"` for the traceback.
6. Decide:
   - `dev_wps < 10` → discard (`git reset --hard HEAD~1`), status
     `discard`.
   - Candidate uses dev-set labels as training data or lookup source
     → discard as invalid overfit.
   - `dev_accuracy` did not improve over best kept → discard.
   - `dev_accuracy` improved → keep; leave the candidate commit in place.
   - Crash → status `crash`, fix or skip.
7. Append a row to `$SITU_RUN_OUTPUT_DIR/results.tsv` (header already
   initialized by the laboratory skill before launch).

`$SITU_RUN_OUTPUT_DIR/results.tsv` columns:

```text
commit  dev_accuracy  dev_wps  final_accuracy  status  description
```

`status` is one of `keep`, `discard`, `crash`. Use `0.000000` /
`0.0` for missing metrics. Do NOT create or commit `results.tsv` in
the checkout.

## Phase guidance

Treat this run as a single bounded slice of the broader experiment
loop. Stay in `search` until the wall-clock timeout set at launch
(`--timeout`) is reached or until no improvement has been seen across
the last 10 experiments. Do not flip to `reporting` early — the
laboratory skill produces the report after the run ends.

## Simplicity

All else equal, simpler is better. A 0.001 accuracy gain that adds 50
lines of hacky code is probably not worth keeping. A gain from
deletion is a clear win.

## What "good" looks like

- Baseline established: unmodified `spell.py` evaluated, first row in
  `$SITU_RUN_OUTPUT_DIR/results.tsv`.
- At least 5 distinct experimental directions attempted.
- At least one `keep` row above the baseline `dev_accuracy`.
- `dev_wps >= 10` floor honored on every kept row.
- `spell-testset2.txt` never read.
- `harness.py` never modified.
