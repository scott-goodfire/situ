---
title: Slice Discipline
status: active
---

# Policy: Slice Discipline

## Applies To

Planning, implementation, architecture, and feature requests.

## Rule

Situ is a single-user, single-machine, terminal-first autoresearch
observability tool. Changes strengthen the local terminal loop —
durability, restart/resume, events, hypotheses, experiments, activities,
artifacts, and automated trust concerns — before they expand orchestration
or surface area.

## Required Checks

- The change advances the one-command local session path.
- The change strengthens durability, restart/resume, events, hypotheses,
  experiments, activities, artifacts, or automated concerns before it
  expands orchestration complexity.
- Situ remains usable by a single user on one machine.
- Out of scope: parallel experiment scheduling, cloud sync, team features,
  remote workers, plugin marketplaces, web UI as the primary surface, live
  guidance, final reports, broad health scoring, and multi-objective
  workspaces.

## Red Flags

- Building broad plugin systems before one worker path works.
- Adding team or cloud concepts before local observability, activity
  capture, and trust concerns are solid.
- Adding parallel experiment scheduling before suspicious-win handling
  exists.
- Designing a complex workspace model before a single-objective session is
  useful.
- Building a web UI as the primary surface before the TypeScript Ink TUI
  is useful.
