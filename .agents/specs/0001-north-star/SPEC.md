# North Star

## Thesis

Almanac is a local-first terminal observability layer for autoresearch sessions.

It helps humans and agents see the live state of a research loop: the objective,
which hypotheses are being explored, which experiments are running, what
activity has been recorded, what artifacts can be inspected, and what the system
appears to be learning.

Short form:

> Almanac makes an autoresearch loop legible while it runs.

## Why It Exists

Raw autoresearch loops are powerful because agents can try many experiments, but
they are fragile:

- They can drift from the objective.
- They can improve metrics for invalid reasons.
- They can accidentally or intentionally change the evaluation harness.
- They can appear busy without producing useful learning.
- They can leave behind logs that are hard to audit.
- They often lose durable memory of what was tried and why a result was trusted
  or excluded.

Almanac exists to make these loops safer and more useful.

## Positioning

Almanac is not primarily another coding agent.

Agents and workers do the work:

- Codex
- Claude Code
- Pydantic AI agents
- Shell scripts
- Custom evaluation tools

Almanac supervises the loop by tracking:

- Objective
- Evaluation context
- Hypotheses
- Experiment ledger
- Hypothesis and experiment activity
- Artifacts that back claims and results
- Internal session/event timeline
- Agent-readable context

## Product Promise

A user should be able to watch an autoresearch loop in a terminal and understand
what is happening without reading raw logs.

That means Almanac must make the work:

- Observable
- Reviewable enough for the current session
- Locally private by default
- Useful to both humans and agents

## Non-Goals

Almanac should not become:

- A generic chat app
- A replacement coding agent
- A full Linear clone
- A broad ML experiment tracker
- A heavy team research platform
- A cloud-first orchestration product
- A plugin marketplace before the core loop works
- A final-report generator before live observability works

The first product should feel like a focused local tool, not a platform.
