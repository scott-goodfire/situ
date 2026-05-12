# @situ/worktrees

Generic git worktree + workspace command primitives for situ. The package
owns the low-level operations: creating a detached worktree, capturing the
current state as a candidate commit + patch, running shell commands inside
a worktree, and the small path/process helpers those need.

```ts
import { worktreeModule } from "@situ/worktrees";

await worktreeModule.create({
  repoPath,
  worktreePath,
  baseCommit,
  requireCleanSource: true,
});

const result = await worktreeModule.runCommand({
  worktreePath,
  command: "uv run pytest -q",
  timeoutMs: 60_000,
});

const candidate = await worktreeModule.captureCandidate({
  worktreePath,
  baseCommit,
  commitMessage: "experiment",
});
// candidate.patchContent is a string; the caller decides where to write it.
```

The package has **zero static dependency on `@situ/app`** — no DI, no
configure call. Operations are pure functions that take the inputs they
need and return data. Callers persist whatever they want from the result.

## What's here

- `worktreeModule.create` — `git worktree add --detach`.
- `worktreeModule.captureCandidate` — `git add -A && git commit && git diff`,
  returns `{ candidateCommit, patchContent, isEmpty }`. No filesystem write
  for the patch — the caller writes the artifact wherever it likes.
- `worktreeModule.runCommand` — `Bun.spawnSync` inside a worktree with
  bounded timeout/buffer, env merging, and a `changedFiles` post-check.
- `worktreeModule.git` / `sourceGitRoot` / `assertCleanWorktree` /
  `changedFiles` — small git wrappers.
- `worktreeModule.commandOutputEnv` — creates a per-label output dir under
  a caller-provided `outputRoot` and returns the `SITU_COMMAND_OUTPUT_DIR`
  / `SITU_RUN_OUTPUT_DIR` env vars.
- `worktreeModule.resolveWorkspaceDirectory` /
  `worktreeModule.assertSameRealPath` — path safety helpers (real-path
  resolution + escape checks).
- `safePathSegment`, `clampNumber` — small exported helpers.
- `PreconditionError` — thrown for path validation failures; recognized by
  the app's tool envelope wrapper via duck-typed `name` check.

## What's NOT here

- **Experiment-aware orchestration** — `runtime/experiment-worktrees/` in
  the app. `prepareExperimentWorktree`, `captureExperimentCandidate`,
  `runExperimentWorkspaceCommand`, and `resolveExperimentWorkspace` look up
  experiment/research-task records, persist worktree metadata, write patch
  artifacts, and add experiment activities. Those are cross-domain
  orchestration; they import from `@situ/worktrees` for the primitives.

## Testing

`bun --filter=@situ/worktrees run test` for the package's unit tests
(currently the small pure helpers). Integration tests that exercise the
full experiment flow stay in the app under
`runtime/experiment-worktrees/worktrees.test.ts`.
