---
name: situ-policy-file-size-and-slice-plan
description: Use whenever a file in projects/app/src approaches or exceeds 400 lines, when adding code to an over-cap file, or when planning to slice a large file.
---

# File Size & Slice Plan

Source files stay under 400 lines. Test files have a softer 600-line cap (co-location beats fragmentation for tests).

## Rules

- New source files fit under 400 lines. Test files fit under 600.
- Source files over 400 lines are tracked in the table below with the
  next responsibility split to make.
- New code that pushes a file past its cap triggers the split first; the
  new code lands in the new file.
- Splits are by responsibility, not line count: pull out a tool, a
  subcommand, a helper — never "the second half".
- Folders gain new files freely. The goal is small modules in clear
  folders, not flat directories.

## Files currently over the cap

| File                                                | Lines | Slice plan                               |
| --------------------------------------------------- | ----- | ---------------------------------------- |
| `data/db/schema.ts`                                 | 599   | table groups by domain                   |
| `data/db/migrate.ts`                                | 428   | runner vs migration list                 |
| `cli/automation-commands.ts`                        | 434   | exec parsing / compute setup / progress  |
| `runtime/dispatch/research-projects.ts`             | 500   | manager vs scientist/verifier dispatch   |
| `repositories/baselines/baseline-repository.ts`     | 407   | setup baseline vs evidence baseline APIs |
| `repositories/evaluations/evaluation-repository.ts` | 401   | evaluation methods / measurement helpers |

`runtime/worktrees/worktrees.test.ts` (787 lines),
`runtime/dispatch/research-projects.test.ts` (844 lines), and
`repositories/repository-contracts.test.ts` (512 lines) are over the
source cap but inside the test cap.

## Avoid

- A new source file is created over 400 lines.
- An over-cap file grows further without updating the table above.
- A "split" produces files that import each other in a tight ring — that's
  a line-count split, not a responsibility split.
- The over-cap file table disagrees with current source.

## See also

- `situ-policy-one-agent-tool-per-file`
- `situ-policy-barrel-exports`
