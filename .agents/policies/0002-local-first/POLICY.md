---
title: Local First
status: active
---

# Policy: Local First

## Applies To

State storage, artifacts, exports, project setup, workers, and integrations.

## Rule

Almanac is private and local by default. It should not write into the researched
repo or send data to hosted services unless the user explicitly opts in.

## Required Checks

- Default runtime state lives outside the researched repo, under a user-local
  Almanac directory.
- Repo writes are explicit exports or user-approved patches.
- Config, objectives, sessions, hypotheses, experiments, activities, events, and
  minimal artifact references are durable locally.
- The product can resume after process restart.
- Hosted model or service calls are optional and visible to the user.

## Red Flags

- Creating hidden runtime directories in the target repo by default.
- Writing generated reports or patches into the repo without an explicit export
  or publish action.
- Depending on cloud state for the current local slice.
- Losing objective, session, hypothesis, experiment, activity, or event state
  after restart.
