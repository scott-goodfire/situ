# `@situ/artifacts`

Durable files, logs, reports, and patches cited by tasks and evidence.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns `Artifact` records. Artifacts point at durable content and
name the target, task, experiment, and source commit they came from when known.
