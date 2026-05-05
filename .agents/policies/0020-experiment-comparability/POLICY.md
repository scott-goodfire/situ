---
title: Experiment Comparability
status: active
---

# Policy: Experiment Comparability

## Applies To

Agent prompts, workspace tools, experiment execution, evaluation result
recording, artifact capture, and concern comments.

## Rule

Experiment evidence must include enough workspace context for a reviewer to
decide whether it is comparable to baseline evidence.

## Required Checks

- Baseline and candidate measurements record the command that produced the
  evidence.
- Candidate measurements inspect workspace state before interpretation when the
  workspace may have changed.
- Dirty starts, untracked files, and generated cache files are visible when they
  affect review.
- Changes to tests, evals, benchmarks, fixtures, dependency files, or toolchain
  config are treated as concern-worthy unless the experiment explicitly covers
  those changes.
- Test count or result-shape changes are called out in the interpretation.
- Accepted and rejected candidate decisions name the code state they apply to
  when git state is available.

## Red Flags

- Treating `tests passed` as sufficient evidence without naming the command and
  workspace state.
- Comparing candidate results to baseline after the eval command changed.
- Silently accepting a candidate that changed tests or dependencies.
- Leaving generated cache files in a candidate diff without comment.
- Resetting or committing on the user's main branch without making the branch
  strategy explicit.

## Review Questions

- Could a human reproduce the result from the recorded state?
- Is the evaluation surface the same as baseline?
- Did the agent distinguish source changes from test/eval/dependency changes?
- Is any non-comparable evidence still preserved as useful but suspicious
  activity?
