---
name: situ-run-laboratory-example
description: Use when running a Situ laboratory example end-to-end — clone an `examples/<name>/` bundle into an isolated lab dir, drive a live agent run, monitor it actively, and produce a REPORT.md.
---

# Situ Run Laboratory Example

## Goal

Drive an end-to-end live Situ run against a pristine example bundle
under `examples/<name>/`, monitor it actively, and produce a portable
report at `~/.situ/reports/<name>-<uuid>/REPORT.md`. The report is the
artifact — its purpose is to feed observed friction back into Situ.

Read the example's `OBJECTIVE.md` and `MANIFEST.md` first. Do not
answer from memory; the per-example contract may have evolved.

## Pick The Example

Bundles live at `examples/<name>/`. List candidates:

```bash
ls examples/
```

Confirm with the operator which example to run and what wall-clock
budget to pass to `--timeout` (in seconds). 1–2 hours is the typical
target.

## CLI Path

This skill runs from inside the Situ checkout. All Situ CLI invocations
use `mise -C "$SITU_REPO" run …` so the laboratory dir does not need
its own `mise.toml`. **Always export `SITU_REPO_PATH="$LAB_DIR"`
before the launch** — `MISE_ORIGINAL_CWD` is empty when `mise -C` is
used, so the task's `${SITU_REPO_PATH:-$MISE_ORIGINAL_CWD}` fallback
silently registers the session against the Situ checkout instead of
the lab dir, and the agent's `run_readonly_workspace_command` /
`run_workspace_command` tools then execute inside the Situ checkout.

Output from `bun --filter=@situ/app` is prefixed with `@situ/app app:`
— strip it with `sed 's/^@situ\/app app: //'` when capturing into
report files. The `[task] $ ...` shell-echo prefix lines (`[exec]`,
`[sessions]`, `[events]`, etc.) are emitted by mise — strip with
`grep -v '^\[[a-z]*\] \$'` rather than hard-coding one prefix.

A `situ` binary is only relevant when running against an installed
release; the laboratory loop targets the dev checkout, not the
installed app.

## Sessions output schema

`mise run sessions -- --json` emits a JSON object wrapped as
`{ "sessions": [{ "sessionId": "...", "workspaceKey": "...",
"repoPath": "...", ... }] }` — not a bare array, and the id field is
`sessionId`, not `id`. Filter on `workspaceKey` (which is a hash of
`SITU_REPO_PATH`) when more than one session may be registered.

## Preconditions

```bash
SITU_REPO=$(git rev-parse --show-toplevel)
( cd "$SITU_REPO" && bun install )
mise -C "$SITU_REPO" run app -- doctor --json 2>&1 \
  | sed 's/^@situ\/app app: //' \
  | grep -v '^\[app\] \$'
```

`bun install` is mandatory — a stale `node_modules` against the
checked-out `bun.lock` will crash `doctor` with errors like
`z.object(...).loose is not a function` (zod v3 on disk vs v4
required). Re-run it whenever the lockfile may have moved since the
last install.

In a source checkout, `doctor` should report `isHealthy: true` when
state is writable and runtime skills are present. Missing built SPA
assets are not a health failure there because `situ app` serves the
web app through Vite source mode. If `isHealthy` is false, inspect the
JSON for the actual missing capability before launch.

Do not clean up pre-existing `~/.situ/laboratory/<name>-*` directories.
Multiple laboratory runs may be active at once. Each launch generates a
UUID-backed `RUN_ID`; keep session lookup and reporting pinned to that
exact `$LAB_DIR` instead of relying on directory scans or "latest run"
heuristics.

## Setup

Generate a run id, materialize the lab dir, initialize git, stamp
pre-run state. Substitute `<name>` and `<budget>` from the operator.

```bash
SITU_REPO=$(git rev-parse --show-toplevel)
NAME=<name>
BUDGET_SECONDS=<budget>
UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
RUN_ID="${NAME}-${UUID}"
TAG=$(date +%Y%m%d-%H%M%S)
LAB_DIR="$HOME/.situ/laboratory/${RUN_ID}"
REPORT_DIR="$HOME/.situ/reports/${RUN_ID}"

mkdir -p "$LAB_DIR" "$REPORT_DIR"
cp -R "$SITU_REPO/examples/${NAME}/." "$LAB_DIR"/
RUN_OUTPUT_DIR="$REPORT_DIR/run-output"
mkdir -p "$RUN_OUTPUT_DIR"
if [ "$NAME" = "spelling-corrector" ]; then
  printf 'commit\tdev_accuracy\tdev_wps\tfinal_accuracy\tstatus\tdescription\n' \
    > "$RUN_OUTPUT_DIR/results.tsv"
fi

cd "$LAB_DIR"
git init -q -b "autoresearch/${TAG}"
git add -A
git -c user.email=laboratory@situ.local -c user.name="Situ Laboratory" \
  commit -q -m "initial ${NAME} bundle"

# Pre-run snapshots.
git rev-parse HEAD > "$REPORT_DIR/lab-initial-sha.txt"
git -C "$SITU_REPO" rev-parse HEAD > "$REPORT_DIR/situ-sha.txt"
mise -C "$SITU_REPO" run app -- doctor --json 2>&1 \
  | sed 's/^@situ\/app app: //' \
  | grep -v '^\[app\] \$' \
  > "$REPORT_DIR/doctor.json"
echo "$BUDGET_SECONDS" > "$REPORT_DIR/budget-seconds.txt"
date -u +%FT%TZ > "$REPORT_DIR/started-at.txt"
echo "$SITU_REPO" > "$REPORT_DIR/situ-repo.txt"
echo "$LAB_DIR" > "$REPORT_DIR/lab-dir.txt"
echo "$RUN_OUTPUT_DIR" > "$REPORT_DIR/run-output-dir.txt"

# Hash every non-editable fixture the manifest names; recompare on tear-down.
( cd "$LAB_DIR" && shasum -a 256 \
    harness.py spell-testset1.txt spell-testset2.txt big.txt 2>/dev/null \
  ) > "$REPORT_DIR/fixture-hashes-initial.txt"
```

If the bundle requires a results table, initialize it under
`$RUN_OUTPUT_DIR` per OBJECTIVE.md. The spelling-corrector bundle is
handled in the setup snippet above. Do not create `results.tsv`,
`run.log`, or other command-output files in `$LAB_DIR`; those belong
outside the checkout.

`$REPORT_DIR/situ-repo.txt`, `$REPORT_DIR/lab-dir.txt`, and
`$REPORT_DIR/run-output-dir.txt` let later Bash calls in this session
reconstruct state without relying on shell variable persistence.

## Launch

From the lab dir, start the run with the bundle's OBJECTIVE.md as the
objective text. Substitute `<LAB_DIR>` so the Manager learns its
workspace from the first line of the objective — it does not read
`session.researchContext` from `--context`, so do not rely on that.
Run it in the background so monitoring can proceed.

```bash
SITU_REPO="$(cat "$REPORT_DIR/situ-repo.txt")"
LAB_DIR="$(cat "$REPORT_DIR/lab-dir.txt")"
RUN_OUTPUT_DIR="$(cat "$REPORT_DIR/run-output-dir.txt")"
BUDGET_SECONDS="$(cat "$REPORT_DIR/budget-seconds.txt")"
cd "$LAB_DIR"
export SITU_REPO_PATH="$LAB_DIR"
OBJECTIVE_TEXT=$(sed "s#<LAB_DIR>#$LAB_DIR#g" OBJECTIVE.md)
SITU_RUN_OUTPUT_DIR="$RUN_OUTPUT_DIR" mise -C "$SITU_REPO" run exec -- \
  --objective "$OBJECTIVE_TEXT" \
  --timeout "$BUDGET_SECONDS"
```

Launch this via Bash with `run_in_background: true`. The exported
`SITU_REPO_PATH` is what makes the session register against the lab
dir (so `repoPath` in `mise run sessions --json` matches `$LAB_DIR`).
Read-only workspace tools resolve against the lab dir. Candidate
`run_workspace_command` calls that target an Experiment may execute in
a per-experiment worktree under `~/.situ/sessions/<session>/worktrees`;
that is expected, and the lab dir branch may remain at its initial
commit. The `SITU_RUN_OUTPUT_DIR` environment variable keeps run logs
and result tables outside the checkout.

Capture the returned session id into `$REPORT_DIR/session-id.txt`
once it appears:

```bash
SITU_REPO_PATH="$LAB_DIR" mise -C "$SITU_REPO" run sessions -- --json 2>&1 \
  | sed 's/^@situ\/app app: //' \
  | grep -v '^\[[a-z]*\] \$' \
  | grep -v '^Exited with' \
  > "$REPORT_DIR/sessions.json"
bun -e '
  const fs = require("fs");
  const labDir = process.argv[2];
  const j = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const match = (j.sessions ?? []).find((s) => s.repoPath === labDir);
  if (!match) {
    console.error(`No session found for lab dir: ${labDir}`);
    process.exit(1);
  }
  console.log(match.sessionId);
' "$REPORT_DIR/sessions.json" "$LAB_DIR" > "$REPORT_DIR/session-id.txt"
```

The web UI is an alternative: `mise run app` from the situ checkout,
then drive the run from the printed local URL. It starts at
`http://127.0.0.1:5500` and falls forward when that port is busy. It
requires the SPA build (see Situ README) and is the slower path —
prefer headless `exec` unless the operator specifically wants the UI.

## Monitor (Active)

While the run is in progress, keep three things going:

1. A persistent event tail to a file the agent can sample:

   ```bash
   mise -C "$SITU_REPO" run events -- \
     --follow --session "$(cat "$REPORT_DIR/session-id.txt")" \
     > "$REPORT_DIR/events.log" 2>&1
   ```

   Launch via Bash with `run_in_background: true`.

2. Periodic state samples (every 10–20 minutes). Pair with `/loop` for
   self-paced wakeups if the operator wants the agent to babysit the
   run unattended. On each sample, read:
   - `git -C "$LAB_DIR" log --oneline | head -30`
   - `cat "$(cat "$REPORT_DIR/run-output-dir.txt")/results.tsv"` if present
   - `tail -n 200 "$REPORT_DIR/events.log"`
   - The latest `claude_agent_runs` and `work_items` rows from
     `~/.situ/sessions/<session-id>/session.sqlite`. Use the read-only
     query pattern in `situ-run-and-verify-evals`. Do not write to the
     session db.

3. A running notes file. Append observations to `$REPORT_DIR/notes.md`
   with timestamps and the tool-call or event id that prompted each
   note. The post-run REPORT.md grows out of these notes.

Flag immediately on these red flags — do not silently recover them,
they belong in the report:

- A tool call references the held-out file named in the manifest
  (for `spelling-corrector`, that is `spell-testset2.txt`).
- A tool call writes to any file the manifest marks read-only.
- A `.py` write introduces a non-stdlib import.
- A `work_items` row stays `claimed` for more than 10 minutes.
- The Manager flips to `reporting` phase before the budget elapses
  (the OBJECTIVE.md tells it to stay in `search`).

## Tear-down

When the budget elapses or the run completes:

```bash
date -u +%FT%TZ > "$REPORT_DIR/ended-at.txt"
SESSION_ID="$(cat "$REPORT_DIR/session-id.txt")"
SITU_REPO_PATH="$LAB_DIR" mise -C "$SITU_REPO" run status -- \
  --session "$SESSION_ID" \
  --json 2>&1 \
  | sed 's/^@situ\/app app: //' \
  | grep -v '^\[[a-z]*\] \$' \
  | grep -v '^Exited with' \
  > "$REPORT_DIR/status-final.json"
git -C "$LAB_DIR" log --oneline > "$REPORT_DIR/git-log.txt"
RUN_OUTPUT_DIR="$(cat "$REPORT_DIR/run-output-dir.txt")"
cp "$RUN_OUTPUT_DIR/results.tsv" "$REPORT_DIR/results.tsv" 2>/dev/null || true
SITU_HOME_DIR="${SITU_HOME:-$HOME/.situ}"
DB_PATH="$SITU_HOME_DIR/sessions/$SESSION_ID/session.sqlite"
sqlite3 -cmd '.timeout 5000' -header -csv "$DB_PATH" \
  "select id,type,title,status,priority,created_at,updated_at,result_summary from research_tasks order by created_at;" \
  > "$REPORT_DIR/research-tasks.csv"
sqlite3 -cmd '.timeout 5000' -header -csv "$DB_PATH" \
  "select id,research_task_id,profile,status,judgment,evidence_summary,created_at from research_task_verifications order by created_at;" \
  > "$REPORT_DIR/research-task-verifications.csv"
sqlite3 -cmd '.timeout 5000' -header -csv "$DB_PATH" \
  "select id,purpose,target_kind,target_id,status,attempt,created_at,updated_at from work_items order by created_at;" \
  > "$REPORT_DIR/work-items.csv"
sqlite3 -cmd '.timeout 5000' -header -csv "$DB_PATH" \
  "select id,agent_id,work_item_id,status,attempt,error_message,created_at,updated_at from claude_agent_runs order by created_at;" \
  > "$REPORT_DIR/claude-agent-runs.csv"
( cd "$LAB_DIR" && shasum -a 256 \
    harness.py spell-testset1.txt spell-testset2.txt big.txt 2>/dev/null \
  ) > "$REPORT_DIR/fixture-hashes-final.txt"
diff -u "$REPORT_DIR/fixture-hashes-initial.txt" \
        "$REPORT_DIR/fixture-hashes-final.txt" \
  > "$REPORT_DIR/fixture-hashes-diff.txt" || true
```

Stop the background event tail.

## Report

Write `$REPORT_DIR/REPORT.md` against the example's `MANIFEST.md`. The
manifest's **Report should capture** section is the canonical
structure — do not invent sections; do not drop sections; write
"none observed" rather than omitting.

Cross-reference every factual claim against an artifact under
`$REPORT_DIR` (events.log line range, results.tsv row, fixture-hashes
diff, sqlite row id). The report must be readable on its own,
without the lab dir.

Always distinguish the example harness decision from Situ verification:

- **Harness decision** comes from the example's metric artifacts, such
  as `results.tsv`. Use "best harness-kept candidate" for the winner.
- **Situ verification** comes from `research-tasks.csv` and
  `research-task-verifications.csv`. State the associated ResearchTask
  status and Verifier verdict when known.
- Do not call a candidate "Situ verified" unless the corresponding
  ResearchTask is `verified` and has a passed verification record.
  If the run times out with related work still `awaiting_verification`,
  label the candidate as metric-backed but not fully Situ-verified.

## Reporting

Tell the operator:

- Lab dir path.
- Report path.
- One-line outcome (baseline vs best harness-kept primary metric, plus
  Situ verification state).
- Whether the constraint-compliance section had any violations.
- Count of improvement candidates surfaced.

## See also

- `examples/<name>/OBJECTIVE.md` — objective text fed to Situ.
- `examples/<name>/MANIFEST.md` — per-example report contract.
- `situ-run-and-verify-evals` — read-only sqlite query patterns for
  observing live runs.
