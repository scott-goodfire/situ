---
name: source-grounding
description: Use when external sources, documentation, papers, or prior records affect a Situ analysis, hypothesis, task, or planning decision.
---

# Source Grounding

## Method

1. Separate local workspace evidence, Situ record evidence, and external source evidence.
2. Prefer primary sources: project docs, package docs, papers, benchmark descriptions, official repositories, and author-maintained notes.
3. Preserve source names and URLs when external evidence changes the plan or analysis.
4. Distinguish what a source directly says from what you infer for this project.
5. Record uncertainty when a source is stale, secondary, ambiguous, or only loosely comparable.

## Situ Output

- Put reusable synthesis in an `Analysis`.
- Put brief coordination context in task comments.
- Put testable claims in `Hypothesis` only when they can guide a future experiment.
- Link tasks to the records they produced or relied on with `link_task_entity`.
