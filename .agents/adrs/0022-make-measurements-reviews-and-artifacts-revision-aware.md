---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0022. Make Measurements, Reviews, And Artifacts Revision-Aware

## Context

If an experiment's candidate commit changes after review feedback, old
measurements and reviews may no longer apply. GitHub PR reviews have the same
issue: an approval is meaningful for the diff that was reviewed, not for every
future commit.

## Decision

Evidence records should name the revision they apply to when they come from an
experiment worktree.

`Measurement` records include `observedCommit` when applicable.

`Review` records include:

- `reviewedCommit` when applicable
- cited measurement ids
- cited artifact ids

`Artifact` records include `sourceCommit` when applicable.

## Consequences

The system can show that `exp_123` was suspicious at `def222` and passed at
`ghi333`.

Reports can distinguish current best evidence from stale evidence.

The app does not need an `ExperimentRevision` model yet. Git commits provide
the revision identity.

## Related

- ADR 0021: Model Experiments As PR-Like Candidate Branches
- ADR 0024: Use Worktrees For Experiment Isolation
