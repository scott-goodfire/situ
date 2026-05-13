---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0021. Model Experiments As PR-Like Candidate Branches

## Context

The original idea of an experiment as a one-shot attempt is too limited. In
practice, a scientist should be able to submit a candidate, receive review
feedback, fix the candidate on the same branch, and resubmit.

GitHub pull requests are a useful analogy: the PR is stable while commits,
checks, comments, and reviews change over time.

## Decision

`Experiment` is a PR-like candidate branch.

It records:

- title and summary markdown
- project
- associated task
- worktree path
- base commit
- current candidate commit
- status
- parent experiment when branching from another candidate

Do not create a new experiment for every requested fix. Update the same
experiment's current candidate commit when the same candidate branch is revised.

Create a child experiment when the approach branches meaningfully.

Experiment statuses stay small:

```text
active, in_review, accepted, rejected, abandoned
```

`active` means the candidate is being developed, measured, or revised.
`in_review` means the current candidate commit is waiting for review.
`accepted` means the current candidate commit is viable enough to keep or
report. `rejected` means the approach was reviewed and should not be pursued
as-is. `abandoned` means work stopped without a final review decision.

Requested-changes flow:

```text
verifier reviews exp_123 at commit def222
  -> Review(status: needs_more_evidence, reviewedCommit: def222)
  -> Comment explaining requested changes
  -> Notification(type: changes_requested) to the scientist
  -> Task returns to in_progress or remains in_review with clear comment

scientist wakes
  -> reads notification, task, review, comments, artifacts, and measurements
  -> reopens exp_123 worktree
  -> fixes the same candidate branch
  -> captures new candidate commit ghi333
  -> records new measurements/artifacts for ghi333
  -> comments summary
  -> moves task to in_review
```

The exact task status depends on whether the next visible action is revision or
review, but the decision and rationale must be visible in a comment/event.

## Consequences

Experiment identity is stable across review iterations.

Measurements, reviews, and artifacts must be revision-aware so old evidence does
not silently apply to a new candidate commit.

Discarded and invalid experiments remain visible because they are part of the
search history.

## Related

- ADR 0002: Optimize For Global Maxima Search
- ADR 0022: Make Measurements, Reviews, And Artifacts Revision-Aware
