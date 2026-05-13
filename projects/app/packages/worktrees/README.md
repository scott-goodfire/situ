# `@situ/worktrees`

Filesystem safety for experiment worktrees and workspace commands.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns path containment, environment filtering, timeouts, command
execution, and captured output. App actions decide how command results become
events, artifacts, measurements, and experiment commit updates.
