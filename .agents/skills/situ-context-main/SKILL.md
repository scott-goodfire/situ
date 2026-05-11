---
name: situ-context-main
description: Use when orienting an agent to the whole Situ codebase before answering broad questions, planning changes, or delegating feature work.
---

# Situ Context Main

## Goal

Build a fresh working map of the repo from current source. Do not answer
from memory. Locate the current implementation, read the files you find,
and report what you inspected.

## What To Look For

Start broad. Learn the repo's moving parts before diving into one area:

- package boundaries and scripts
- `.agents` docs, policies, workflow skills, and context skills
- app/runtime source
- web source
- evals, fixture worlds, and e2e tests
- tests, stories, and fixtures
- recent uncommitted changes

Then locate the active product and runtime surfaces by concept:

- `ResearchProject`
- `ResearchTask`
- `ResearchTaskVerification`
- Manager / Scientist / Verifier roles
- API routes and route mounting
- Replicache pull/push/sync
- work items and agent runs
- custom tools and runtime skills
- web routes, page adapters, hooks, and app-ui views

Also look for old names that should only remain in compatibility cleanup
or forbidden-marker evals:

- `AgentObjective`
- `ResearchMove`
- `Critic`
- `agent-objective`
- `situ-critic`

## What To Learn

Build a short map of:

- where durable state is defined
- where state is created or transitioned
- how queued work is dispatched and executed
- how web data reaches the UI
- how tests/evals/stories prove expected behavior
- which branches you did not inspect

If the user asks about a specific area, continue with the focused context
skill for that area: research flow, runtime, web, evals, or meta-layer. If
the user asks for a refactor, cleanup pass, or tradeoff recommendation,
also load `situ-context-codebase-priorities`.

## Investigation Pattern

For any feature:

1. Locate durable records, protocol types, or public API shapes.
2. Trace writes from route, tool, repository, runtime, or UI action.
3. Trace reads through sync, hooks, pages, views, reports, or evals.
4. Read tests, evals, and stories that prove behavior.
5. Note missing coverage or branches you did not inspect.
6. Run the narrowest relevant check before broad checks.

Prefer concept and symbol searches over fixed file lists. If code moves,
the nouns and responsibilities should still lead you to it.

## Reporting

Return:

- files read
- current entry points and data flow
- tests/evals/stories that prove behavior
- unknowns or uninspected branches
- next places to inspect for the user's specific question
