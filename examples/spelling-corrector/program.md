# autoresearch / spell

Autonomous research on Norvig's spelling corrector. Adapted from
[karpathy/autoresearch](https://github.com/karpathy/autoresearch) — same
loop, non-ML target.

## Setup

Work with the user to:

1. **Agree on a run tag** based on today's date (e.g. `may5`). Branch `autoresearch/<tag>` must not already exist.
2. **Create the branch**: `git checkout -b autoresearch/<tag>` from current main.
3. **Read the in-scope files**:
   - `harness.py` — read-only eval. **DO NOT MODIFY.**
   - `spell.py` — the file you edit. Norvig's 21-line corrector.
   - `big.txt` — corpus used to build the word-frequency table. You may add additional corpora; do not delete this file.
4. **Verify data**: `ls big.txt spell-testset1.txt spell-testset2.txt`.
5. **Initialize `$SITU_RUN_OUTPUT_DIR/results.tsv`** with the header row (see
   "Logging results"). This output directory must be outside the checkout.
6. **Confirm and go**.

## Experimentation

Each experiment runs the eval harness:

```
python harness.py > "$SITU_RUN_OUTPUT_DIR/run.log" 2>&1
```

**What you CAN do:**
- Modify `spell.py` — change the algorithm, candidate generator, scoring function, the corpus loaded, anything.
- Add helper files (additional corpora, lookup tables, precomputed indexes).

**What you CANNOT do:**
- Modify `harness.py`, `spell-testset1.txt`, or `spell-testset2.txt`.
- Use `spell-testset1.txt` labels as training data, lookup tables, or
  frequency boosts. The dev set is for harness scoring only.
- Read `spell-testset2.txt` for ideas. It is **held out**. Optimizing against it invalidates the run.
- Add dependencies outside Python stdlib.

## The metric

Primary signal: **`dev_accuracy`** on `spell-testset1.txt`.

**Hard floor:** `dev_wps >= 10`. Runs below this floor are **always discarded**, regardless of accuracy gains.

**Held out:** `final_accuracy` (testset2) is reported but never drives keep/discard.

**Time budget:** 60 seconds wall clock per experiment. Exceeding it counts as a crash.

**Simplicity:** All else equal, simpler is better. A 0.001 accuracy gain that adds 50 lines of hacky code is probably not worth keeping. A gain from deletion is a clear win.

**The first run** is the baseline — run the eval unmodified.

## Output format

Harness prints:

```
---
dev_accuracy:      0.748148
dev_wps:           150.2
dev_unknown_rate:  0.0556
dev_n:             270
final_accuracy:    0.675000  # held-out, do not optimize
final_wps:         130.4
eval_seconds:      4.95
total_seconds:     5.10
wps_floor:         10
meets_floor:       True
```

Extract key metrics:
`grep "^dev_accuracy:\|^dev_wps:\|^final_accuracy:" "$SITU_RUN_OUTPUT_DIR/run.log"`.

## Logging results

Append to `$SITU_RUN_OUTPUT_DIR/results.tsv` (tab-separated). Header:

```
commit	dev_accuracy	dev_wps	final_accuracy	status	description
```

Columns:
1. short git hash (7 chars)
2. `dev_accuracy` (use `0.000000` for crashes)
3. `dev_wps` (use `0.0` for crashes)
4. `final_accuracy` (held-out reference; `0.000000` for crashes)
5. `status`: `keep`, `discard`, or `crash`
6. short description of what was tried

Do NOT create or commit `results.tsv` in the checkout.

## The experiment loop

LOOP FOREVER:

1. Look at git state.
2. Tune `spell.py` with an experimental idea.
3. Inspect `git status --short`, remove generated files such as
   `__pycache__/` or `*.pyc`, then stage only intentional files with
   explicit paths such as `git add spell.py helper.py`.
4. `git commit -m "..."`.
5. `python harness.py > "$SITU_RUN_OUTPUT_DIR/run.log" 2>&1`.
6. `grep "^dev_accuracy:\|^dev_wps:\|^final_accuracy:" "$SITU_RUN_OUTPUT_DIR/run.log"`.
7. If grep is empty, run crashed. `tail -50 "$SITU_RUN_OUTPUT_DIR/run.log"` for the traceback. Fix or skip.
8. Decide:
   - **`dev_wps < 10`** → discard (`git reset --hard HEAD~1`).
   - **`dev_accuracy` did not improve** over current best → discard.
   - **`dev_accuracy` improved** → keep; leave the candidate commit in place.
9. Append to `$SITU_RUN_OUTPUT_DIR/results.tsv`.

**NEVER STOP**: once started, run autonomously until manually interrupted.

If stuck, consider: weighted edit costs (transpositions cheaper than substitutions), Damerau–Levenshtein, larger edit distance with better pruning, n-gram or character-level language model context, smoothing of word frequencies, additional corpora, keyboard-distance scoring, common-typo lookup tables.
