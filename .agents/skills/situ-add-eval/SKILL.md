---
name: situ-add-eval
description: Use when adding or changing a Situ live agent eval. For non-LLM marker or fixture checks, write a co-located test instead — see `situ-policy-test-file-placement`.
---

# Situ Add Eval

## Before Editing

Read the eval guidance first:

```bash
sed -n '1,220p' .agents/docs/evals-strategy/DOC.md
sed -n '1,260p' .agents/docs/evals-playbook/DOC.md
sed -n '1,220p' .agents/skills/situ-policy-eval-strategy/SKILL.md
```

Inspect the current eval package:

```bash
find projects/evals -maxdepth 4 -type f | sort
```

## Choose The Layer

In situ, evals are always LLM-backed. If your assertion doesn't need a real
Claude call, it is a test or an e2e test — not an eval:

- **Co-located `*.test.ts`** — prompt markers, runtime skill markers, fixture
  shape, deterministic prompt-output checks, seeded durable-state shape. See
  `situ-policy-test-file-placement`.
- **Playwright spec under `projects/e2e-tests/tests/`** — whole-app live flows,
  CLI smoke, live agent slice runs that exercise multiple system layers
  end-to-end. See `situ-policy-e2e-test-shape`.
- **Live agent eval under `projects/evals/src/`** — Evalite suite that hits a
  real Claude Managed Agent or Anthropic message endpoint. Use this only when
  the question is whether the model makes the right agentic move given a staged
  world. Requires `SITU_ANTHROPIC_KEY`.

## Fixture And World Shape

Put pure data in `@situ/evals-fixtures`. Put temp repositories, migrations,
SQLite seeding, CLI calls, and live world helpers in `@situ/evals-worlds`.
Both packages live under `projects/evals/packages/` because they exist to serve
eval suites. Their own unit tests live as co-located `*.test.ts` inside those
packages (bun:test).

## Live Agent Eval Shape

Start from a staged fixture world:

- empty repo needing a baseline
- existing baseline
- existing candidate result
- comparability concern needing review

Run one focused real slice. Assert durable SQLite state: ResearchProjects,
ResearchProjectInteractions, ResearchTasks, ResearchTaskVerifications, work
items, Claude runs/events, records, activities, artifacts, and links. Do not
treat a successful final text response as sufficient.

## Verification

For test changes (co-located `*.test.ts`):

```bash
mise run test
```

For live agent eval changes, when the user wants live verification:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals
```

If the user explicitly says not to run evals, run only formatting/type checks
and report that the live eval was intentionally skipped.

## Reporting

Report which layer changed (test, e2e, or live agent eval), which fixture stage
the eval covers, what durable state it asserts, and exactly which commands were
or were not run.
