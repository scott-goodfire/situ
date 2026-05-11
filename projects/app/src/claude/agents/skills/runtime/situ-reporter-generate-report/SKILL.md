---
name: situ-reporter-generate-report
description: Per-invocation procedure for the situ Reporter when producing a session report directory.
---

# Generate a Session Report

## Goal

Produce a short, opinionated session report that tells the story of what the
research loop did — what stuck, what broke, what's worth applying next.
Style reference: `logbooks/spelling-corrector/autoresearch.md` in this repo.

Not a chronological dump. The reader should walk away knowing the headline,
whether to trust it, what the named failure modes were, and which 1–2
changes are worth applying.

## Output Contract

Files in the report output directory (working dir of `run_report_command`):

- `REPORT.md` — the narrative. Target 60–100 lines. Hard cap 120.
- `README.md` — short index of what each file in the directory is.
- `trajectory.png` — chart of the primary metric across experiments.
- `DETAILS.md` — audit appendix: per-experiment paragraphs with durable IDs.
- `patches/<slug>/changes.patch` + `patches/<slug>/NOTES.md` — 1–2 patches
  the Reporter recommends applying, up to 5 if there are genuinely distinct
  directions. If no kept result is worth recommending, skip `patches/`
  entirely and explain in REPORT.md and README.md.

Do **not** leave a matplotlib script in the report directory. Render the
chart from `/tmp/situ-report-<random>/` and copy only the PNG back.

## Step 1 — Gather

See `situ-reporter-runtime` for the full read list. At minimum: research
project, chronological experiments, per-experiment measurements,
verifications, baseline, and `list_feed_entries` (the Scribe's running
narration — use these as the chronological spine, not raw event logs).

## Step 2 — Outline before writing

Before any heredoc, decide:

1. **Headline numbers.** Baseline → best on the primary metric; held-out
   movement; whether they move together.
2. **Phases.** Three to five clusters by hypothesis family or time. Name
   each one for its theme, not its dates.
3. **Defensibly real? per phase.** Use this rubric — write the value
   into the phase table verbatim:
   - **Yes** — delta exceeds 2× the metric's quantization floor, dev and
     held-out move together, and the change is verified non-vacuous
     (firing rate > 0).
   - **Partly** — delta exceeds the floor but does not exceed 2×, or dev
     moves while held-out is flat or noisy.
   - **Partly noise** — delta sits at the quantization floor (single-item
     flips). Single-experiment phases at this magnitude default here.
   - **No (N in a row)** — multiple consecutive discards on the same
     hypothesis without redesign; the phase is greedy-stuck.
4. **What worked.** Two to four changes that produced real signal. Why
   each one worked, not what it did. Cite the experiment ID and the delta.
5. **What broke.** Three to five named failure modes ("dilution",
   "vocabulary ceiling", "quantization-level keep"). Point at the
   experiments that demonstrate each.
6. **Patches to recommend.** One or two by default. PR-shaped: each one
   is a coherent direction someone could apply. If the only kept result
   was marginal, recommend zero and say so in the README.
7. **Open threads.** ResearchTasks still `planned` or `running` at the
   report cutoff. One line each.

## Step 3 — Write REPORT.md

Sections, in order:

1. `# <slug> — session report` — one-line title.
2. Headline paragraph — three to five lines. Baseline → best, held-out,
   run duration, one-sentence verdict. If dev and held-out moved
   together, say so — that is the main reassurance against adaptive
   overfitting.
3. `![trajectory](trajectory.png)` — embed the chart.
4. `## Phase overview` — table with columns
   `Phase | <primary metric> | Theme | Defensibly real?`. One row per
   phase. Themes are short.
5. `## What worked` — two to four bullets. Each bullet leads with the
   change in bold, then two to four sentences on _why_ it worked, with
   deltas and at least one experiment ID.
6. `## What broke` — three to five bullets. Each leads with a **named
   failure mode** in bold, then evidence. Failure modes the reader
   should remember after closing the report.
7. `## Patches` — one line per recommended patch:
   `- [<slug>](patches/<slug>/) — one-line description.` Empty section
   is allowed; the README explains.
8. `## Open threads` — bulleted list, one line each.

Cite durable IDs sparingly — once per claim is enough. The audit trail
lives in DETAILS.md.

## Step 4 — Curate patches

For each recommended patch:

1. Find the experiment via `list_experiments` / `get_experiment`. Choose
   experiments whose work you would tell the user to apply.
2. Find the patch artifact:
   `search_artifacts({ entityKind: "experiment", entityId, kind: "patch" })`.
   The artifact's `path` field is the absolute on-disk location.
3. `cp <path> patches/<slug>/changes.patch` via `run_report_command`.
   Slug names the _recommendation_ (`common-typo-lookup`), not the
   experiment ID.
4. Write `patches/<slug>/NOTES.md` — PR description shape, around ten
   lines:
   - One paragraph: what the change does and why it is worth applying.
   - Evidence: experiment ID, delta on dev, delta on held-out.
   - Caveats: what to verify before merging; whether the gain sits near
     the noise floor.

If no kept result clears the noise floor, recommend zero patches.

## Step 5 — Write README.md

Logbook-style. Project context paragraph plus a `## Files` list.
Reference: `logbooks/spelling-corrector/README.md`. Five to fifteen lines
total. If `patches/` is empty, the `## Files` section explains why.

## Step 6 — Render trajectory.png

Write the matplotlib script to a `/tmp/situ-report-$$/_make_trajectory.py`,
run `python3 /tmp/situ-report-$$/_make_trajectory.py`, then `cp` the
resulting PNG into the report directory. Do not leave the script behind.
Annotation positioning uses `textcoords="offset points"` so callouts stay
readable when the y-range shifts.

## Step 7 — Write DETAILS.md

Per-experiment paragraphs in chronological order, citing `exp_…`,
`rtsk_…`, `msr_…`, and commit hashes. This is the audit trail. Density
is fine here — REPORT.md absorbed the legibility budget.

## Stop

When `REPORT.md`, `README.md`, `trajectory.png`, and `DETAILS.md` exist
(plus any patches the Reporter chose to include), the turn is complete.
Do not call additional tools.
