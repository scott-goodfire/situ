---
title: MVP Discipline
status: active
---

# Policy: MVP Discipline

## Applies To

Planning, implementation sequencing, architecture, and feature requests.

## Rule

The first slice should be extremely narrow but real: one local project, one
goal, one eval command, one metric, one worker path, sequential experiments,
durable state, terminal observability, current best valid result, and very slim
guardrails.

## Required Checks

- The change advances the one-command local run path.
- The change strengthens durability, restart/resume, events, experiments,
  current best valid result, or slim warnings before expanding orchestration
  complexity.
- Parallelism, cloud sync, team features, remote workers, plugin marketplaces,
- web UI, live guidance, final reports, broad health scoring, and multi-goal
  workspaces are deferred unless explicitly scoped as future design docs.
- The MVP remains usable by a single user on one machine.

## Red Flags

- Building broad plugin systems before one worker path works.
- Adding team/cloud concepts before local observability and trust are solid.
- Adding parallel experiment scheduling before suspicious-win handling exists.
- Designing a complex workspace model before a single-goal run is useful.
- Building a web UI before the TypeScript TUI is useful.
