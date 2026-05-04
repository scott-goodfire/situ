---
title: Product Scope
status: active
---

# Policy: Product Scope

## Applies To

All product, UX, architecture, and implementation changes.

## Rule

Almanac is a local-first terminal observability layer for autoresearch runs. It
is not a generic coding agent, chat app, Linear clone, or broad experiment
tracker.

## Required Checks

- The change helps humans or agents understand, trust, steer, or audit a run.
- The change strengthens the goal, experiment ledger, event timeline, current
  best valid result, or slim guardrails.
- The change does not make chat the primary product surface.
- The change does not make raw logs the primary product surface.
- The change does not require a specific agent provider.
- The change does not introduce web UI, live guidance, final reports, or broad
  health scoring into the first slice.

## Red Flags

- Product copy or UI centers on "chat with your research agent".
- The system stores logs but does not produce a useful event timeline,
  experiment ledger, or current best valid result.
- The implementation optimizes for generic task execution before run
  supervision exists.
- The product asks users to manage internal abstractions before they can start a
  run.
