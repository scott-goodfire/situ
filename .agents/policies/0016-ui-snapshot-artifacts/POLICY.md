---
title: UI Snapshot Artifacts
status: active
---

# Policy: UI Snapshot Artifacts

## Applies To

Story-driven screenshots and snapshots for the web UI, TUI UI package, and any
future UI package that captures fixture-rendered states.

## Rule

UI snapshot artifacts are review aids, not product state. They should be
generated from fixture-driven stories, written outside the repo by default, and
kept close to the render path a user actually sees.

## Required Checks

- Keep story snapshots fixture-driven. Snapshot commands should not require a
  live Almanac session, RPC server, or external workspace.
- Write generated artifacts under `/tmp` by default unless the caller passes an
  explicit output directory.
- Do not commit generated snapshots or PNGs unless the change intentionally adds
  a checked-in baseline.
- Preserve a plain text TUI snapshot mode for readable diffs.
- Preserve an ANSI-colored TUI snapshot mode for terminal replay. In this repo,
  that means `./commands/tui-snapshots.sh --color` and viewing with `less -R`.
- When TUI PNGs are generated, derive them from the same captured ANSI frame
  used for the `.txt` snapshot rather than re-rendering a separate fixture path.
- A TUI PNG command should also emit the ANSI `.txt` file so reviewers can
  inspect both the terminal-native artifact and the rendered image.
- Use stable dimensions, monospace fonts, and deterministic local fixtures for
  PNG capture.
- Treat PNGs as visual review artifacts, not pixel-perfect tests, unless a
  change explicitly introduces visual regression baselines.

## Red Flags

- A PNG screenshot is generated from a different story state than the text
  snapshot.
- Color is enabled after importing Ink or story modules, making ANSI output
  inconsistent.
- Snapshot commands only work when a local run is active.
- Generated artifacts are written into source directories by default.
- A reviewer must mentally map a screenshot back to a different text snapshot.

## Review Questions

- Can the reviewer compare plain text, ANSI text, and PNG artifacts for the same
  story ID?
- Would rerunning the command in a clean workspace produce the same fixture
  states?
- Is the output location disposable and obvious?
- Is the snapshot command documenting what it writes?
