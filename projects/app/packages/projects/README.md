# `@situ/projects`

Human-level goals, summaries, and project status.

## Local Commands

```bash
mise run check
mise run test
```

## Purpose

This package owns the `Project` primitive. Projects are the human-facing goal
and answer records for a local autoresearch run.

## Record Shape

The initial type surface is in `src/types.ts`. Persistence arrives in the first
backend vertical slice.

## App-Owned Behavior

The app package composes project writes with tasks, comments, notifications,
events, reports, and sync transactions.
