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
CurrentStateService(repos=repos).get()
CollectionsService(repos=repos).bootstrap()
```

The minimum useful assertion is that writes round-trip through both the owning
repository and the relevant API service/schema.

## Runtime Smoke

When wiring changes touch the harness runtime, run at least one TUI smoke:

```bash
./commands/start.sh . --max-experiments 1
```

When worker/eval-command behavior changes, also run an external workspace smoke:

```bash
tmp=$(mktemp -d /private/tmp/almanac-ext.XXXXXX)
./commands/start.sh "$tmp" \
  --eval-command "python /path/to/eval.py" \
  --known-signal score \
  --max-experiments 1
```

Runtime state is written under `~/.almanac/projects/<project-id>/`. Tests that
need isolated state should pass temporary paths to constructors instead of
setting user env vars.

## Storybook

The web UI has Storybook stories for fixture-driven monitor states and
presentational components. Use Storybook when changing browser UI layout,
empty/error states, or visual treatment:

```bash
./commands/storybook.sh
./commands/storybook-build.sh
./commands/storybook-screenshots.sh
```

The build command is the non-interactive verification. It should pass without a
live Almanac session, because stories use local fixtures rather than RPC/SSE.
The screenshot command starts Storybook, captures every story with Playwright,
and writes PNGs under `/tmp/almanac-storybook-screenshots/<timestamp>/`.

## Protocol Shape

The TUI consumes protocol-shaped dictionaries. If API schemas or repository
return values change, validate the output against the protocol models before
relying on manual inspection.

Useful targets:

```text
CollectionsBootstrapResult
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
- A protocol validation check for `CurrentStateService(repos=repos).get()`.
- A non-interactive smoke test that runs the harness without rendering the TUI.
- A regression test for suspicious evidence warnings.
