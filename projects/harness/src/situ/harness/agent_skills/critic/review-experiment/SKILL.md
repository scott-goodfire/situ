---
name: review-experiment
description: Methodology reference for reviewing an experiment record. Describes what to check and common failure modes. Invoked from the Critic role prompt as guidance.
---

# Review Experiment

An experiment review has two lanes depending on the record's current status.

## Triage Lane (status: `triage`)

The producer proposed an experiment. Check whether the design and intent are
sound before the experiment runs.

**Context Acquisition**

1. Read the experiment record and its activities with `get_experiment` and
   `list_experiment_activities`.
2. Read linked hypotheses and any related prior experiments.

**What to Check**

- The experiment has a clear, testable claim.
- The proposed change is scoped enough to isolate what is being tested.
- The evaluation approach is described well enough to produce comparable
  measurements.

**Action**

- If the design is sound: `accept_experiment` with a comment.
- If not: `cancel_experiment` with a comment naming the specific issues.

## In-Review Lane (status: `in_review`)

The producer finished work and submitted the experiment for evidence vetting.
Check whether the recorded evidence is trustworthy enough to shape planning.

**Context Acquisition**

1. Read the experiment record, its activities, linked evaluations, measurements,
   artifacts, and workspace-state observations with `get_experiment`,
   `list_experiment_activities`, `list_evaluations`, `list_measurements`, and
   `list_artifacts` as appropriate.
2. Read the project board and any linked Scientist task for authorship context.
3. Use read-only workspace tools to inspect candidate files or diffs when the
   diff or final worktree state matters. Do not edit files or run candidate
   experiments.

**Failure Modes to Check**

- Claimed improvements are not supported by recorded measurements.
- Command, interpreter, toolchain, tests, fixtures, dependencies, generated
  files, or result shape differ from baseline without explanation.
- Evidence of seed hacking or cherry-picked random seeds.
- Selection on noisy repeated measurements without corroborating runs.
- Adaptive overfitting to the same evaluation surface.
- Suspiciously large metric improvement without corroborating context.
- Measurement evidence is missing or the evaluation did not run to completion.

**Action**

- If the evidence is trustworthy enough to shape planning:
  `complete_experiment` with a comment that summarizes what was checked and
  why the result is usable.
- If not: `cancel_experiment` with a comment that names each issue clearly.
  The comment is the reason; make it specific enough for the Manager to
  decide the next step without asking for clarification.

## Out of Scope

- Creating new experiments, hypotheses, or measurements.
- Running new candidate experiments.
