---
name: review-evaluation
description: Methodology reference for reviewing an evaluation record. Describes what to check and common failure modes. Invoked from the Critic role prompt as guidance.
---

# Review Evaluation

An evaluation review has two lanes depending on the record's current status.

## Triage Lane (status: `triage`)

The producer proposed an evaluation. Check whether the measurement scope and
association are sound before measurements are recorded.

**Context Acquisition**

1. Read the evaluation record and its activities with `get_evaluation`.
2. Read the associated baseline or experiment record to understand what this
   evaluation is intended to measure.

**What to Check**

- The evaluation title and scope describe a clear, bounded measurement thread.
- The association with a baseline or experiment (but not both) is correct.

**Action**

- If the design is sound: `accept_evaluation` with a comment.
- If not: `cancel_evaluation` with a comment naming the specific issues.

## In-Review Lane (status: `in_review`)

The producer finished gathering measurements and submitted the evaluation for
evidence vetting. Check whether the measurement thread is internally
consistent, clearly scoped, comparable to related evaluations, and evidenced
well enough to support the conclusions attached to it.

**Context Acquisition**

1. Read the evaluation record and its activities with `get_evaluation` and
   `list_evaluation_activities`.
2. Read measurements under the evaluation with `list_measurements`.
3. Read the associated baseline or experiment record to understand what this
   evaluation is measuring and what it should be compared against.
4. Read linked artifacts and workspace-state context when the eval command
   or environment is relevant.

**Failure Modes to Check**

- The evaluation title or scope does not match what the measurements actually
  measured.
- Measurements within the evaluation used different commands, interpreters,
  or toolchain configurations without explanation.
- Metric keys or result shape changed across measurements in the same
  evaluation, breaking comparability within the thread.
- The number of completed measurements is too low to support the stated
  conclusion.
- The evaluation is associated with both a baseline and an experiment, which
  is structurally ambiguous.
- Artifacts or logs that the measurements reference are missing.

**Action**

- If the evaluation thread is clear and usable: `complete_evaluation` with a
  comment that summarizes what was checked and why the measurement thread is
  reliable.
- If not: `cancel_evaluation` with a comment that names each issue clearly.
  The comment is the reason; make it specific enough for the producer to
  act on.

## Out of Scope

- Creating new evaluations or measurements.
- Running new evaluation commands.
