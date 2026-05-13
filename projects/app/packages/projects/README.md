# `@situ/projects`

Human-level goals, summaries, and project status.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns the `Project` primitive. Projects are the human-facing goal
and answer records for a local autoresearch run.

## Record Shape

The package owns project types, schema, repository behavior, sync prefix, and
boundary tests.

## App-Owned Behavior

The app package composes project writes with tasks, comments, notifications,
events, reports, and sync transactions.
