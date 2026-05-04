# Testing Strategy

This repo is still an MVP, so testing should stay fast and focused while making
the durable run ledger hard to break.

## Current Checks

Run:

```bash
./commands/check.sh
```

This performs Python syntax checks, regenerates protocol artifacts, and runs the
TypeScript typechecks.

## Repository Layer

For repository changes, use a temporary SQLite database and exercise the changed
paths directly:

```text
Database(temp_path, project_id="project_test", repo_path="/tmp/project")
Repositories.create(db)
repos.project_config.set(...)
repos.runs.create(...)
repos.experiments.create(...)
repos.evidence.add(...)
repos.warnings.add(...)
repos.findings.upsert(...)
repos.events.add(...)
repos.snapshots.get()
```

The minimum useful assertion is that writes round-trip through both the owning
repository and `SnapshotsRepository`.

## Runtime Smoke

When wiring changes touch the harness runtime, run at least one TUI smoke with a
temporary `ALMANAC_HOME`:

```bash
ALMANAC_HOME=/private/tmp/almanac-smoke ./commands/start.sh . --max-experiments 1
```

When worker/eval-command behavior changes, also run an external workspace smoke:

```bash
tmp=$(mktemp -d /private/tmp/almanac-ext.XXXXXX)
ALMANAC_HOME=/private/tmp/almanac-ext-smoke ./commands/start.sh "$tmp" \
  --eval-command "python /path/to/eval.py" \
  --known-signal score \
  --max-experiments 1
```

## Protocol Shape

The TUI consumes protocol-shaped dictionaries. If snapshots or repository return
values change, validate the output against the protocol models before relying on
manual inspection.

Useful targets:

```text
StateSnapshotResult
ProjectConfigRecord
RunRecord
ExperimentRecord
EvidenceRecord
FindingRecord
WarningRecord
EventRecord
```

## What To Add Next

The next durable test improvements should be:

- A small Python repository test script or pytest suite using temp SQLite.
- A protocol validation check for `repos.snapshots.get()`.
- A non-interactive smoke test that runs the harness without rendering the TUI.
- A regression test for suspicious evidence warnings.
