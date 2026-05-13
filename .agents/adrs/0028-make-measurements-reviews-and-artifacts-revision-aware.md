---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0028. Make Measurements, Reviews, And Artifacts Revision-Aware

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
- status
- markdown rationale

Review statuses stay small:

```text
approved, changes_requested, needs_more_evidence, rejected, commented
```

`approved` and `rejected` should cite the evidence that supports the judgment.
`changes_requested` means the same experiment can be revised and resubmitted.
`needs_more_evidence` means the reviewer cannot make a judgment from the
current measurements or artifacts. `commented` is non-binding feedback.

`Artifact` records include `sourceCommit` when applicable.

## Consequences

The system can show that `exp_123` needed more evidence at `def222` and was
approved at `ghi333`.

Reports can distinguish current best evidence from stale evidence.

A review of an experiment commit is current only while `reviewedCommit` matches
the experiment's current candidate commit. Older reviews remain useful history
but should not be treated as approving or rejecting a newer revision.

The app does not need an `ExperimentRevision` model yet. Git commits provide
the revision identity.

## Related

- ADR 0027: Model Experiments As PR-Like Candidate Branches
- ADR 0030: Use Worktrees For Experiment Isolation
