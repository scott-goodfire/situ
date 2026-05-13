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

## Consequences

Experiment identity is stable across review iterations.

Measurements, reviews, and artifacts must be revision-aware so old evidence does
not silently apply to a new candidate commit.

Discarded and invalid experiments remain visible because they are part of the
search history.

## Related

- ADR 0002: Optimize For Global Maxima Search
- ADR 0022: Make Measurements, Reviews, And Artifacts Revision-Aware
