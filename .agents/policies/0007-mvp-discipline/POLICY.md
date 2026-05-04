---
title: MVP Discipline
status: active
---

# Policy: MVP Discipline

## Applies To

Planning, implementation sequencing, architecture, and feature requests.

## Rule

The first slice should be extremely narrow but real: one local project, one
goal, one evaluation context, one worker path, sequential experiments, durable
state, terminal observability, evidence/signals, lightweight findings, and
automated trust warnings.

## Required Checks

- The change advances the one-command local run path.
- The change strengthens durability, restart/resume, events, experiments,
  evidence, findings, or automated warnings before expanding orchestration
  complexity.
- Parallelism, cloud sync, team features, remote workers, plugin marketplaces,
- web UI, live guidance, final reports, broad health scoring, and multi-goal
  workspaces are deferred unless explicitly scoped as future design docs.
- The MVP remains usable by a single user on one machine.

## Red Flags

- Building broad plugin systems before one worker path works.
- Adding team/cloud concepts before local observability, evidence capture, and
  trust warnings are solid.
- Adding parallel experiment scheduling before suspicious-win handling exists.
- Designing a complex workspace model before a single-goal run is useful.
- Building a web UI before the TypeScript TUI is useful.
