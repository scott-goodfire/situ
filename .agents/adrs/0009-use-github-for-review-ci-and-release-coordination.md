---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0009. Use GitHub For Review, CI, And Release Coordination

## Context

Situ's product model intentionally resembles human collaboration around tasks,
comments, reviews, and candidate branches. GitHub is the external coordination
surface for source control, pull request review, CI, and release publishing.

The app should not duplicate GitHub's source-control role, and GitHub should
not replace Situ's local product primitives.

## Decision

Use GitHub for source review, CI, and release coordination.

GitHub workflows should:

- declare explicit permissions
- install tools through `jdx/mise-action`
- install dependencies with Bun
- call `mise run <task>` rather than inlining tool commands
- keep check workflows and release workflows separate
- isolate stateful release smoke tests with `SITU_HOME`, `SITU_INSTALL_HOME`,
  and `SITU_BIN_DIR` under runner temp directories

Pull requests are the place for human source review. Situ `Review` records are
product records about experiments, evidence, and reports; they are not GitHub
PR reviews.

## Consequences

CI should run the same checks humans and agents run locally.

Workflow YAML stays small because tool versions and command composition live in
`mise.toml` and scripts.

Release workflows may publish GitHub Releases, but the release artifact shape
is defined by the distribution ADR and release scripts.

## Related

- ADR 0007: Use Mise As The Repo Command Surface
- ADR 0010: Build Installable Local CLI Release Artifacts
- ADR 0032: Model Experiments As PR-Like Candidate Branches
