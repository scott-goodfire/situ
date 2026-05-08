---
title: Agent Boundaries
status: active
---

# Policy: Agent Boundaries

## Applies To

Workers, agent integrations, CLI/API, protocol design, and orchestration.

## Rule

Situ supervises the session. Agents and workers perform concrete work.

## Required Checks

- Workers report results, progress, artifacts, and proposed changes through
  explicit interfaces.
- The harness/control plane owns objective/session lifecycle, durable records,
  internal events, hypotheses, experiments, activities, artifacts, and automated
  trust concerns.
- Agent-readable context is compact and durable, not inferred from chat logs.
- The product does not depend on one agent provider.
- Creativity stays in the worker/proposer layer; objective/session identity and
  activity persistence stay in Situ.

## Red Flags

- Worker internals become the only source of durable research state.
- Agent prompts become the only source of trust checks or user decisions.
- The UI talks directly to worker internals instead of the control plane.
- Situ requires a specific hosted agent service.
