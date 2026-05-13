---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0003. Make Humans Summary-First And Agents Board-First

## Context

Humans should not have to operate Situ like a project manager living in an issue
tracker. The app should show the human a goal, current answer, confidence,
blockers, important evidence, and final report.

Agents, however, need a detailed work surface. They need tasks, comments,
notifications, experiments, measurements, reviews, artifacts, and events.

## Decision

Situ will be summary-first for humans and board-first for agents.

Humans primarily interact with:

- project goal
- current answer summary
- open questions
- progress checkpoints
- final report artifacts
- read-only evidence drilldown
- occasional steering input

Agents operate the primitive board:

- claim tasks
- read comments and notifications
- create experiments
- record measurements
- request and respond to reviews
- attach artifacts

## Consequences

The backend cannot treat the task board as only UI state. It is the agent work
surface and must be durable.

The `Project` record must include human-facing summaries.

The web UI should support inspection views for tasks and evidence, but those
views are not the primary human workflow.

Human steering should become ordinary product records, usually comments, task
updates, or new tasks.

For example, if the human says "pause new scoring experiments until leakage
review is complete", the app should not create a hidden global pause flag by
default. A coordinator should record the steering as a project comment, update
the project open-questions or blocker summary, create or prioritize a leakage
review task, label affected work, block relevant tasks with visible comments,
and notify the right agent.

## Related

- ADR 0001: Build A Local Autoresearch App
- ADR 0002: Optimize For Global Maxima Search
- Architecture: `.agents/docs/architecture/DOC.md`
