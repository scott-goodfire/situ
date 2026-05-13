# `@situ/tasks`

Agent work items for planning, handoff, execution, and review.

## Local Commands

```bash
mise run check
mise run test
```

## Purpose

This package owns the `Task` primitive and its package-local type surface.
Tasks are the visible board items agents claim and move through small statuses.

## Status And Type Values

Task status and type constants live in `src/types.ts` and follow ADR 0024.

## App-Owned Behavior

Assignment, notification creation, comments, events, and cross-package target
checks are app actions.
