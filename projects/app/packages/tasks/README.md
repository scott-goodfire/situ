# `@situ/tasks`

Agent work items for planning, handoff, execution, and review.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns the `Task` primitive and task labels. Tasks are the visible
board items agents claim and move through small statuses.

## Status And Type Values

Task status and type constants live in `src/types.ts` and follow ADR 0029.

## App-Owned Behavior

Assignment, notification creation, comments, events, and cross-package target
checks are app actions.
