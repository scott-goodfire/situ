# `@situ/events`

Append-only audit/debug facts for visible product records.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns the `Event` primitive. Events explain what happened; comments
carry narrative handoff.

## App-Owned Behavior

App actions decide which user-visible state changes should record events.
