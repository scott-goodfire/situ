# `@situ/common`

Shared type helpers and constants for primitive packages.

## Local Commands

```bash
mise run check
mise run test
mise run coverage
```

## Purpose

This package owns cross-cutting TypeScript values that packages can import
without depending on `@situ/app`.

## Non-Goals

- App runtime composition
- Database connection setup
- Cross-package existence checks
