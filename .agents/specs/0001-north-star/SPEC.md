# North Star

## Thesis

Almanac is a local-first terminal observability layer for autoresearch runs.

It helps humans and agents see the live state of a loop: what is running, what
changed, what the eval said, what looks suspicious, and what the current best
valid result is.

Short form:

> Almanac makes an autoresearch loop legible while it runs.

## Why It Exists

Raw autoresearch loops are powerful because agents can try many experiments, but
they are fragile:

- They can drift from the goal.
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

Almanac supervises the first loop by tracking:

- Goal
- Eval command and primary metric
- Experiment ledger
- Event timeline
- Current best valid result
- Simple guardrails
- Suspicious-result warnings
- Agent-readable status

## Product Promise

A user should be able to watch an autoresearch loop in a terminal and understand
what is happening without reading raw logs.

That means Almanac must make the run:

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
