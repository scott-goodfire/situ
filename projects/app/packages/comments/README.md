# `@situ/comments`

Markdown handoff attached to visible product records.

## Local Commands

```bash
mise run check
mise run test
```

## Purpose

This package owns the `Comment` primitive. Comments carry narrative context for
agents and humans.

## App-Owned Behavior

The app package decides when a state change should also create comments,
notifications, or events.
