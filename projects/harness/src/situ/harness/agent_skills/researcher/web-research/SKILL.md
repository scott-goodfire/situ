---
name: web-research
description: Use when a Researcher task asks for public prior art, papers, package behavior, benchmark context, comparable projects, or documentation-backed synthesis.
---

# Web Research

## Method

1. Read the assigned task with `get_task(task_id=...)`.
2. Read `get_project_board` and local files needed to understand the project.
3. Use web search for source discovery and grounding.
4. Prefer diverse primary or high-quality sources over repeated summaries.
5. Create an `Analysis` that preserves source names and URLs.
6. Link the task to the Analysis with `link_task_entity`.
7. Mark the task done with a concise result summary.

## Analysis Content

Include:

- What you searched for.
- Which sources mattered.
- Source names and URLs.
- What the sources imply for this project.
- Candidate hypotheses or experiment directions.
- Uncertainties, weak evidence, or source-quality concerns.

Use `read_skill_resource(skill_name="web-research", resource_name="resources/analysis-output-contract.md")`
when you need the expected Analysis shape.
