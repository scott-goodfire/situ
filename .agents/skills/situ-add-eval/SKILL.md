---
name: situ-add-eval
description: Use when adding or changing a Situ live agent eval.
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

Use product tests, not evals, when the question is deterministic app behavior:
API routes, repositories, scheduler dispatch, settings, Replicache sync, browser
UI, or persistence of fake agent output.

Use tests when the check is mechanical:

- prompt markers
- runtime skill markers
- fixture schema and scenario shape
- durable-state shape from seeded worlds

These tests may use Evalite, but they are not evals because no LLM is being
judged.

Use a live agent eval only when model or tool choice matters. Live agent evals
require `SITU_ANTHROPIC_KEY` and should usually target 2-3 minutes. A focused
Scientist-plus-Verifier eval may use a larger explicit budget.

## Fixture And World Shape

Put pure data in `@situ/evals-fixtures`.

Put temp repositories, migrations, SQLite seeding, CLI calls, and live world
helpers in `@situ/evals-worlds`.

Keep non-LLM marker/world tests under `projects/evals/src/*.eval.ts`. Keep live
eval scripts near the world they exercise. If a Node/Vitest Evalite file needs
Bun-only app behavior, call a Bun bridge script instead of importing
`bun:sqlite` directly.

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

For test changes:

```bash
bun --filter=@situ/evals run check
bun --filter=@situ/evals-fixtures run check
bun --filter=@situ/evals-worlds run check
mise run test
```

For live agent eval changes, when the user wants live verification:

```bash
SITU_ANTHROPIC_KEY=sk-ant-... mise run evals
```

If the user explicitly says not to run evals, run only formatting/type checks
and report that the live eval was intentionally skipped.

## Reporting

Report which layer changed, which fixture stage the eval covers, what durable
state it asserts, and exactly which commands were or were not run.
