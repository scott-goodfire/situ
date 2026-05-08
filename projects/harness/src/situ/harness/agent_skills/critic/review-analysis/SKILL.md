---
name: review-analysis
description: Methodology reference for reviewing an analysis record. Describes what to check and common failure modes. Invoked from the Critic role prompt as guidance.
---

# Review Analysis

An analysis review checks whether the analysis is grounded in observed
evidence, scoped tightly enough to be actionable, and useful enough to guide
later hypotheses or experiment planning.

## Context Acquisition

1. Read the analysis record and its activities with `get_analysis` and
   `list_analysis_activities`.
2. Read linked artifacts, related hypotheses, and any prior review activities
   on the analysis.
3. Read project-level context via `get_project_overview` when the project
   objective or research context is needed to judge scope.

## Failure Modes to Check

- Claims are not supported by evidence cited or linked in the analysis body.
- The analysis scope is too vague to guide a concrete next hypothesis or
  experiment.
- The analysis is a duplicate of existing project understanding without
  materially new synthesis.
- The analysis references workspace or measurement evidence that is not
  recorded in the project.
- Conclusions are stated with more confidence than the cited evidence warrants.

## Action

Read the evidence, form a judgment, then call the appropriate transition tool:

- If the analysis is grounded and useful: `accept_analysis` with a comment
  that summarizes what was checked and what makes the analysis actionable.
- If the analysis is not usable: `cancel_analysis` with a comment that names
  each issue clearly. The comment is the reason; make it specific enough for
  the producer to act on.

## Out of Scope

- Creating new analyses, hypotheses, or experiments.
