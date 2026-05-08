---
name: hypothesize-task
description: Use when a Researcher is assigned a `hypothesize` task and must turn analyses or project evidence into testable hypotheses.
---

# Hypothesize Task

## Method

1. Load `task-execution`.
2. Read the assigned task and relevant analyses, measurements, experiments, and project board context.
3. Identify claims that can guide a concrete future experiment.
4. Create or update `Hypothesis` records for those claims.
5. Link the task to each created hypothesis and to the strongest supporting Analysis or evidence records.
6. Call `complete_task` with a summary naming the strongest hypotheses and what a Scientist should test next.

## Hypothesis Bar

- The title should be a short testable claim.
- The summary should include mechanism, expected metric direction, and local change surface.
- The hypothesis should explain what evidence would support or falsify it.
- Basic Markdown is fine in the summary when it makes the claim easier to scan;
  keep titles readable as one-line claims.
- Do not create hypotheses for generic notes, literature summaries, or "maybe try X" ideas without a measurable expectation.
