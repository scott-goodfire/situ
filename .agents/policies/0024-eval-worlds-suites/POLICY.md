---
title: Eval Worlds And Suites
status: active
---

# Policy: Eval Worlds And Suites

## Applies To

Eval fixture worlds under `evals/worlds/**`, eval suites under
`evals/suites/**`, eval framework additions, eval cases, evaluators, groups,
and tool-call capture used for live model evaluation.

## Rule

Evals separate fixture worlds from behavior suites. Worlds own realistic setup,
state seeding, teardown, and agent invocation helpers. Suites own cases,
evaluators, and eval-group registration. Live agent evals should use real model
calls and assert behavior through records, tool calls, events, and artifacts,
not only final prose.

## Required Checks

- Fixture worlds live under `evals/worlds/<world_name>/` and expose typed world
  setup plus output models.
- Suites live under `evals/suites/<surface>/<suite_name>/` with `cases.py`,
  `evaluators.py`, `eval_group.py`, and `__init__.py` when the suite has a
  stable behavior target.
- Worlds may provide controlled fixtures, temporary workspaces, SQLite state,
  fake external systems, and cleanup. They must not script the model's choices
  in an AI eval.
- Suites define behavior cases with clear names, metadata, expected tools or
  records, and deterministic evaluators when possible.
- Inputs and outputs are typed models. Avoid passing raw dict bundles between a
  world and a suite when a small model would make assertions clearer.
- Realistic agent behavior uses real Pydantic AI entrypoints and task queues
  when coordination is what the product depends on.
- Tool-call assertions should be role-specific when roles matter. When
  runtime skills matter, assert that the relevant skill was loaded, using
  whichever load primitive the implementation exposes.
- Evals should inspect durable records, project boards, activity records,
  events, worktree state, tool-call order, and artifacts where those are the
  evidence a human would trust.
- Deterministic tests cover world setup and helper behavior without requiring
  model credentials.
- Executing AI eval cases fails clearly when required model or network secrets
  are missing; discovery and listing should not require them.
- Targeted iteration should be possible with a case-level eval command. Full
  integrated eval suites may be slower and should be used for regression
  verification.

## Red Flags

- Fixture setup hidden inside a suite case instead of a reusable world.
- An AI eval that passes without a real model call.
- An eval that asserts only the final text summary when the behavior depends on
  tool use, records, task transitions, or workspace state.
- A deterministic unit test that requires API keys, network, or Logfire.
- A world that mutates the user's real repo instead of a temporary fixture
  workspace.
- A single huge evaluator that mixes setup, execution, assertion, and
  reporting.
- A multi-agent behavior covered only by isolated manager-only or
  scientist-only evals.
- Runtime skill behavior claimed in docs but not asserted by tool-call capture
  when the skill is expected.

## Review Questions

- Is the world reusable and realistic enough for the behavior being evaluated?
- Does the suite assert the observable behavior, not just an implementation
  detail or final prose?
- Would a failed run leave enough records, events, tool calls, and Logfire data
  to debug without immediate rerun?
- Is this a deterministic test concern, a targeted live eval concern, or a full
  integrated workflow eval concern?
