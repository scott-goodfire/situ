# Testing Strategy

This repo is still in an early slice, so testing should stay fast and focused
while making the durable workspace/project/session ledger hard to break.

## Current Checks

Run:

```bash
./commands/check.sh
```

This performs Python syntax checks, runs the Python pytest suite, regenerates
protocol artifacts, and runs the TypeScript typechecks and package tests.

## Repository Layer

For repository changes, use a temporary SQLite database and exercise the changed
paths directly:

```text
Database(temp_path, workspace_id="workspace_test", repo_path="/tmp/project")
repos = Repositories.create(db)
workspace = repos.workspaces.ensure()
project = repos.projects.create(
    project_id="project_test",
    workspace_id=workspace.id,
    title="Test project",
    objective="Improve the target behavior.",
    research_context="Run local evals and compare score.",
)
repos.sessions.create("session_test", workspace_id=workspace.id, project_id=project.id)
repos.analyses.create(...)
repos.hypotheses.create(...)
repos.experiments.create(...)
repos.evaluations.create(...)
repos.hypothesis_experiment_links.create(...)
repos.analysis_activities.add(...)
repos.experiment_activities.add(...)
repos.hypothesis_activities.add(...)
repos.evaluation_activities.add(...)
repos.events.add(...)
CurrentStateService(repos=repos).get()
CollectionsService(repos=repos).bootstrap()
```

The minimum useful assertion is that writes round-trip through both the owning
repository and the relevant API service/schema.

## Runtime Smoke

When wiring changes touch the harness runtime, run at least one TUI smoke:

```bash
./commands/app.sh
./commands/tui.sh . --max-experiments 1
```

When workspace command execution behavior changes, also run an external
workspace smoke:

```bash
tmp=$(mktemp -d /private/tmp/situ-ext.XXXXXX)
./commands/app.sh
./commands/tui.sh "$tmp" \
  --objective "Exercise the external workspace eval path." \
  --context "Run make eval from the repo root. It prints score and tests_passed." \
  --max-experiments 1
```

Runtime state is written under `~/.situ/projects/<project-id>/`. Tests that
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
live Situ session, because stories use local fixtures rather than RPC/SSE.
The screenshot command starts Storybook, captures every story with Playwright,
and writes PNGs under `/tmp/situ-storybook-screenshots/<timestamp>/`.

## TUI Stories

The Ink TUI has a Storybook-like fixture runner in `@situ/tui-ui`. Stories
live next to components as `.stories.tsx` files and render protocol-shaped local
fixtures, not live RPC state.

Use these when changing TUI layout, component states, or command-footer behavior:

```bash
./commands/tui-story.sh list
./commands/tui-story.sh situ-tui-view/running
./commands/tui-snapshots.sh
./commands/tui-snapshots.sh --color
./commands/tui-snapshots.sh --png
```

The story command renders one story in the terminal. The snapshot command uses
`ink-testing-library`, captures every story's last rendered frame, and writes
text snapshots under `/tmp/situ-tui-snapshots/<timestamp>/` unless an
explicit `--out-dir` is passed. Color snapshots preserve ANSI escape codes in
the `.txt` files for terminal replay; plain snapshots remain the default for
readable diffs. PNG snapshots are derived from the same ANSI frame and write a
matching `.png` beside each `.txt` file.

## Protocol Shape

The TUI consumes protocol-shaped dictionaries. If API schemas or repository
return values change, validate the output against the protocol models before
relying on manual inspection.

Useful targets:

```text
CollectionsBootstrapResult
WorkspaceRecord
ProjectRecord
SessionRecord
AnalysisRecord
AnalysisActivityRecord
HypothesisRecord
ExperimentRecord
EvaluationRecord
HypothesisExperimentLinkRecord
HypothesisActivityRecord
ExperimentActivityRecord
EvaluationActivityRecord
ArtifactRecord
EventRecord
```

## Agent Tool Evals

The eval runner is opt-in because it makes real model calls:

```bash
./commands/evals.sh --list
./commands/evals.sh evals/suites/tools/research_tools/eval_group.py
```

`--list` should work without model or Logfire credentials. Executing eval cases
requires the eval secrets described in
[evals-strategy](../evals-strategy/DOC.md). The research-tool suite uses
temporary SQLite session worlds and the real Situ research toolset, so it is
the right smoke when changing Pydantic AI tools, toolsets, or tool-call capture.

## What To Add Next

The next durable test improvements should be:

- A non-interactive smoke test that runs the harness without rendering the TUI.
- A regression test for suspicious result concern comments.
- A deterministic test for `SessionsService(repos=repos).get_session(...)`
  across multiple sessions once cross-session links become possible.
