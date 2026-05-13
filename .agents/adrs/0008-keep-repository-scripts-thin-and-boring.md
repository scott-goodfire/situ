---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0008. Keep Repository Scripts Thin And Boring

## Context

Some repo commands are clearer as shell scripts than as large inline `mise`
tasks. Classic Situ used scripts for check composition, test composition,
policy linting, coverage summaries, release packaging, and install flows.

Scripts are useful, but they can also become hidden workflow engines if they
encode product policy.

## Decision

Repository scripts are thin command implementations.

Use:

- `scripts/` for developer, verification, audit, coverage, and meta-layer
  helper scripts
- `config/scripts/` for distribution, release, install, and platform packaging
  scripts

Scripts should:

- start with `#!/usr/bin/env bash` and `set -euo pipefail`
- print short step labels for multi-step commands
- call `mise run <task>` or package scripts instead of duplicating tool config
- use `SITU_*` environment variables for project-specific overrides
- keep temp directories isolated and cleaned up
- avoid product-state transitions or agent orchestration logic

If a script becomes hard to explain in a short paragraph, move the behavior
into TypeScript or split the script.

## Consequences

Scripts remain easy for agents to inspect and modify.

The command surface stays in `mise.toml`; scripts are implementation details
behind those tasks.

Release and install scripts may be more involved than development scripts, but
they should still be deterministic, environment-driven, and smoke-testable.

## Related

- ADR 0007: Use Mise As The Repo Command Surface
- ADR 0010: Build Installable Local CLI Release Artifacts
- ADR 0012: Keep Agent Skills And Policies Slim
