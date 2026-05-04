---
title: Agent Boundaries
status: active
---

# Policy: Agent Boundaries

## Applies To

Workers, agent integrations, CLI/API, protocol design, and orchestration.

## Rule

Almanac supervises the run. Agents and workers perform concrete work.

## Required Checks

- Workers do not mutate Almanac state directly; they report results, progress,
  artifacts, and proposed changes through explicit interfaces.
- The harness/control plane owns run lifecycle, ledger, events, experiments,
  current best valid result, and slim guardrails.
- Agent-readable context is compact and durable, not inferred from chat logs.
- The product does not depend on one agent provider.
- Creativity stays in the worker/proposer layer; run identity and evidence stay
  in Almanac.

## Red Flags

- A worker directly edits the run ledger or computed observability state.
- Agent prompts become the only source of guardrails or user decisions.
- The UI talks directly to worker internals instead of the control plane.
- The MVP requires a specific hosted agent service.
