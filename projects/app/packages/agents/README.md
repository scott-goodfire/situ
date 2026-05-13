# `@situ/agents`

Visible agent actors that can own work and receive notifications.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns the `Agent` primitive. Agent rows are product state: they name
the visible actors that can be assigned tasks, review work, and wake from inbox
notifications.

Claude runtime state belongs in `@situ/agent-sessions`.
