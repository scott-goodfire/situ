---
name: review-hypothesis
description: Methodology reference for reviewing a hypothesis record. Describes what to check and common failure modes. Invoked from the Critic role prompt as guidance.
---

# Review Hypothesis

A hypothesis review checks readiness for experimentation. It does not prove
the hypothesis is true. It checks whether the hypothesis is concrete,
testable, grounded, and worth running an experiment against.

## Context Acquisition

1. Read the hypothesis record and its activities with `get_hypothesis` and
   `list_hypothesis_activities`.
2. Read related analyses and any prior review activities on the hypothesis.
3. Inspect the project board for related hypotheses to judge novelty and
   overlap.

## Failure Modes to Check

- The hypothesis does not name a measurable change or a specific claim that
  an experiment could be designed against.
- The hypothesis is not supported by observed evidence, prior analysis, or
  stated assumptions — bare speculation with no grounding.
- The hypothesis duplicates or is a trivial variant of an existing hypothesis
  without a meaningful new angle.
- An experiment cannot be sketched without inventing missing context.
- The hypothesis contradicts established results in the project without
  acknowledging the conflict.

## Action

Read the evidence, form a judgment, then call the appropriate transition tool:

- If the hypothesis is concrete, grounded, and ready for empirical work:
  `accept_hypothesis` with a comment that summarizes what was checked and why
  the hypothesis is ready.
- If the hypothesis is not ready: `cancel_hypothesis` with a comment that
  names each issue clearly. The comment is the reason; make it specific enough
  for the producer to act on.

## Out of Scope

- Creating new hypotheses, analyses, or experiments.
