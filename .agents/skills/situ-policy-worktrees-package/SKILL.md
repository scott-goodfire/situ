---
name: situ-policy-worktrees-package
description: Use whenever adding or modifying code under projects/app/packages/worktrees, wiring @situ/worktrees into the app, or touching any git worktree, run-command, or capture-candidate code that crosses the package boundary.
---

# `@situ/worktrees` Package Shape

Generic git worktree + workspace command primitives live in their own
workspace package at `projects/app/packages/worktrees/`. The package owns
the low-level operations that don't know about experiments or research
tasks. Experiment-aware orchestration (looking up records, persisting
metadata, writing patch artifacts, adding activities) stays in
`projects/app/src/runtime/experiment-worktrees/`.

```text
projects/app/packages/worktrees/
├── package.json                  # @situ/worktrees, single barrel
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                  # public barrel
    ├── module.ts                 # worktreeModule namespace
    ├── types.ts                  # CommandResult, CaptureCandidateResult
    ├── __shared__/               # PreconditionError, safePathSegment, …
    └── operations/
        ├── git.ts                # git, sourceGitRoot, assertCleanWorktree, changedFiles
        ├── create.ts             # git worktree add --detach
        ├── capture-candidate.ts  # commit + diff, returns patch content
        ├── run-command.ts        # Bun.spawnSync wrapper with bounded io
        ├── workspace-paths.ts    # resolveWorkspaceDirectory, assertSameRealPath
        └── command-output-env.ts # per-label SITU_COMMAND_OUTPUT_DIR helper
```

## Rules

- **Single barrel export.** Consumers import from `@situ/worktrees`. No
  sub-path exports.
- **`worktreeModule` is the high-level surface.** Pure functions accessed
  through `worktreeModule.create(...)`,
  `worktreeModule.captureCandidate(...)`, etc. No `configure` call,
  no DI — the package has zero static dependency on `@situ/app`.
- **No persistence, no records.** The package returns data; callers
  decide what to write. `captureCandidate` returns
  `{ candidateCommit, patchContent, isEmpty }`; the caller writes the
  patch artifact wherever it likes. `create` writes the worktree to
  disk but doesn't update any records.
- **Internal `__shared__/` may duplicate small app helpers** (`PreconditionError`,
  trivial `clampNumber`/`safePathSegment`/process-output utilities) rather
  than reach into `@situ/app/modules/*`. Keep the static dep graph clean.
- **Cross-domain orchestration stays in the app.** Anything that calls
  `experimentRepository`, `researchTaskRepository`, or
  `artifactRepository` lives in `runtime/experiment-worktrees/` and
  imports `@situ/worktrees` for the primitives.
- **`PreconditionError` is duck-typed across the boundary.** The package's
  `PreconditionError` class is distinct from the app's, but
  `defineTool` matches by `error.name === "PreconditionError"` plus
  `code`/`hint` fields, so structured envelopes work across packages.
  Keep the constructor setting `this.name = "PreconditionError"`.

## Avoid

- Importing from inside the package's `__shared__/` or operation files
  directly. Use the barrel: `import { worktreeModule } from "@situ/worktrees"`.
- Adding sub-path exports (`@situ/worktrees/git`).
- Importing `@situ/app` symbols (the runtime context, repositories,
  modules) from inside the package — even transitively.
- Persisting experiment/research-task records inside the package. If a
  new operation needs to update a record, write the operation as
  data-in/data-out and let `runtime/experiment-worktrees/` do the
  persistence.
- Adding a `configure<X>` call to the package. The pure-function shape
  is intentional: it's what makes the package zero-DI and free of
  import-cycle risk.

## See also

- `situ-policy-compute-package`
- `situ-policy-barrel-exports`
- `situ-extract-app-package`
