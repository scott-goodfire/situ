# Agent-Facing Context

Almanac should be useful to agents as well as humans.

Agents should not have to infer durable research state from an ever-growing chat
transcript. Almanac should expose compact, current, machine-readable context.

## Agent Questions

An agent should be able to ask:

- What is the current goal?
- What is the primary metric?
- What slim guardrails apply?
- What has already run?
- What is the current best valid result?
- Which experiments were suspicious, and why?
- What is running now?

## Candidate CLI/API Surface

The exact interface can evolve, but the product should support commands like:

```bash
almanac status --json
almanac snapshot --json
almanac experiments --json
almanac events --json
```

Defer richer guidance and proposal-context commands until the basic loop is
working.

## Snapshot Context

`snapshot` should include:

- Goal
- Eval command
- Metric key and direction
- Baseline metric
- Current run status
- Active experiment
- Recent events
- Recent experiments
- Current best valid result
- Warnings

## Product Rule

Almanac owns durable research context. Agent prompts can be creative, but they
should not be the only place where the research contract lives.
