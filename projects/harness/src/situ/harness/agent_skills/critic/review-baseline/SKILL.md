---
name: review-baseline
description: Methodology reference for reviewing a baseline record. Describes what to check and common failure modes. Invoked from the Critic role prompt as guidance.
---

# Review Baseline

A baseline review has two lanes depending on the record's current status.

## Triage Lane (status: `triage`)

The producer proposed a baseline. Check whether the design and measurement
plan are sound before the baseline runs.

**Context Acquisition**

1. Read the baseline record with `get_baseline`.
2. Read its review trail with `list_baseline_activities`.

**What to Check**

- The baseline has a clearly described measurement command and scope.
- The evaluation approach will produce comparable, repeatable measurements.

**Action**

- If the design is sound: `accept_baseline` with a comment.
- If not: `cancel_baseline` with a comment naming the specific issues.

## In-Review Lane (status: `in_review`)

The producer finished measuring and submitted the baseline for evidence
vetting. Check whether the baseline evidence is complete enough, comparable
enough, and clearly enough recorded to serve as a reference point for
candidate experiments.

**Context Acquisition**

1. Read the baseline record with `get_baseline`.
2. Read its review trail with `list_baseline_activities`.
3. Read evaluations and measurements associated with the baseline using
   `list_evaluations` and `list_measurements`.
4. Read workspace-state context attached to the baseline measurements when
   the eval command, commit, or dirty state is relevant to comparability.
5. Read linked artifacts.

**Failure Modes to Check**

- Baseline measurements are missing or the evaluation did not run to
  completion.
- The eval command, interpreter, or toolchain used for the baseline is not
  recorded, making future comparisons ambiguous.
- The workspace was dirty at measurement time without an explicit explanation.
- Result shape or metric keys are not recorded in a way that supports future
  comparison.
- Multiple baseline runs show high variance without explanation.

**Action**

- If the baseline evidence is usable for comparison: `complete_baseline` with
  a comment that summarizes what was checked and why the baseline is reliable.
- If not: `cancel_baseline` with a comment that names each issue clearly.
  The comment is the reason; make it specific enough for the producer to
  act on.

## Out of Scope

- Creating new baselines, experiments, or measurements.
- Running new baseline commands.
