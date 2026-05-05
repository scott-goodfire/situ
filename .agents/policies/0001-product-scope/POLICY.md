---
title: Product Scope
status: active
---

# Policy: Product Scope

## Applies To

All product, UX, architecture, and implementation changes.

## Rule

Almanac is a local-first terminal observability layer for autoresearch sessions.
It is not a generic coding agent, chat app, Linear clone, or broad experiment
tracker.

## Required Checks

- The change helps humans or agents understand, trust, steer, or audit an
  autoresearch session.
- The change strengthens objective, research context, hypotheses,
  experiments, activities, artifacts, internal events, or agent-readable
  context.
- The change keeps evidence, warnings, findings, and decisions activity-shaped
  unless there is a strong product reason to promote them later.
- The change does not make chat the primary product surface.
- The change does not make raw logs the primary product surface.
- The change does not require a specific agent provider.
- The change does not introduce web UI as the primary surface, live guidance,
  final reports, or broad health scoring into the first slice.

## Red Flags

- Product copy or UI centers on "chat with your research agent".
- The system stores logs but does not produce useful objects, activities,
  artifact references, or an internal event timeline.
- The implementation optimizes for generic task execution before session
  supervision exists.
- The product asks users to manage internal abstractions before they can start a
  session.
