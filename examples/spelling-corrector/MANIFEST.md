# Spelling Corrector — Run Manifest

This file describes what a laboratory run of this example should
produce and what the post-run REPORT.md should capture. The
`situ-run-laboratory-example` skill uses this contract to structure
the report it writes after the run ends.

## Bundle files

- `.gitignore` — ignores Python bytecode and cache directories so
  generated files do not enter candidate commits.
- `spell.py` — Norvig's spelling corrector. The Scientist edits this.
- `harness.py` — read-only eval. Modifying it invalidates the run.
- `big.txt` — word-frequency corpus (Sherlock Holmes + Project
  Gutenberg fragments). ~6 MB. Treat as input data.
- `spell-testset1.txt` — dev set (drives keep / discard). It is
  evaluation data, not training data; candidate code must not read or
  encode its correct-answer labels.
- `spell-testset2.txt` — held-out set. Reading it for ideas
  invalidates the run.
- `program.md` — autoresearch program statement, adapted from
  [karpathy/autoresearch](https://github.com/karpathy/autoresearch).
  Local tweaks (e.g. lowered `dev_wps` floor) live here; keep this
  in sync with `harness.py`.
- `OBJECTIVE.md` — the text the laboratory skill feeds to Situ.
- `MANIFEST.md` — this file.

## Run produces

In the lab directory (`~/.situ/laboratory/spelling-corrector-<uuid>`):

- The source checkout copied from this example.
- The initial branch `autoresearch/<tag>` created by the laboratory
  skill before launch. This branch may remain at the initial commit
  when candidate work is done in Situ experiment worktrees.

In per-experiment worktrees under
`~/.situ/sessions/<session-id>/worktrees/<experiment-id>`:

- Candidate edits to `spell.py`.
- Git history for kept candidate commits. `discard` decisions are
  erased by `git reset --hard HEAD~1` in that worktree.

In the run output directory
(`~/.situ/reports/spelling-corrector-<uuid>/run-output`):

- `results.tsv` — one row per experiment (header + rows). This is not
  part of the project checkout.
- `run.log` — output of the last harness invocation (overwritten per
  experiment). This is not part of the project checkout.

## Report should capture

In `~/.situ/reports/spelling-corrector-<uuid>/REPORT.md`:

### Run identity

- UUID, start timestamp, end timestamp.
- Situ git sha at run start.
- Wall-clock budget set at launch (`--timeout` value).
- `situ doctor --json` excerpt.
- Session id (from `~/.situ/registry.json` or `mise run sessions`).

### Outcome

- Baseline `dev_accuracy`, `dev_wps`, `final_accuracy`.
- Best harness-kept candidate commit plus its `dev_accuracy`,
  `dev_wps`, `final_accuracy`, and keep/discard rationale from
  `results.tsv`.
- Situ verification state for that best harness-kept candidate:
  associated ResearchTask id if known, ResearchTask status,
  ResearchTaskVerification id/status/judgment if present, and any
  related open task that was still `planned`, `running`, or
  `awaiting_verification` at timeout.
- Number of experiments, kept count, discarded count, crash count.
- Prose summary of how `dev_accuracy` moved over time. Distinguish
  harness-kept metric candidates from Situ-verified results; do not
  describe a candidate as Situ-verified unless the durable ResearchTask
  status is `verified` and a passed verification record exists.

### Constraint compliance

- `harness.py` unmodified? Compare sha256 against the bundle copy.
- `spell-testset1.txt`, `spell-testset2.txt` unmodified? sha256
  compare.
- `spell-testset1.txt` used only by the harness? Search candidate
  patches and command/tool history for direct reads or right-column
  label extraction. Flag any candidate that trains on dev labels as
  invalid overfit, not a clean improvement.
- `spell-testset2.txt` never read? Search the event stream and tool
  calls for that filename — flag any hit.
- No non-stdlib imports added? `grep -E "^(import|from) " spell.py`
  and any added helper files; cross-check against stdlib module list.

### Role behavior

- Manager phase transitions observed (timestamps).
- Scientist task-type mix (explore / exploit / debug / verify /
  synthesize / prune).
- Verifier verdict distribution (passed / failed / suspicious /
  needs_more_evidence).
- Any role asking the user a question — what and why.

### Friction log

Operator notes captured during monitoring on what slowed the loop,
where Situ got in its own way, where the agent fought program
semantics (e.g., balked at `git reset --hard HEAD~1` despite the
pre-authorization), where verification felt rubber-stamp vs
substantive. Each entry should include a pointer to the moment
(timestamp + tool call or event id).

### Improvement candidates

Specific, actionable Situ changes inferred from the run. Each entry:

- Title — short noun phrase.
- Observed behavior — what happened, with timestamp.
- Proposed change — file:line if applicable.
- Evidence — event id, tool call id, or sqlite row reference.

### Artifact paths

- Lab dir path.
- Snapshotted `run-output/results.tsv`.
- Sample events excerpt (10–20 lines around interesting moments).
- Session sqlite path (`~/.situ/sessions/<session-id>/session.sqlite`).
