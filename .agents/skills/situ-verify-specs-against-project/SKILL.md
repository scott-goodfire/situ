---
name: situ-verify-specs-against-project
description: Use when checking whether .agents specs match this repo's actual code, runtime behavior, release packaging, local state, or product surface.
---

# Situ Verify Specs Against Project

## Goal

Audit whether specs under `.agents/specs` still match the codebase and runtime
behavior. Surface drift and propose targeted updates. Do not silently rewrite
specs or code unless the user asks.

If there are no specs yet, say so and recommend specific specs only if current
work has created a durable contract worth capturing.

## Frame The Audit

```bash
find .agents/specs -name SPEC.md -print 2>/dev/null | sort
sed -n '1,220p' .agents/specs/README.md 2>/dev/null || true
git status --short
git diff --stat
```

## Per-Spec Process

For each spec:

1. Extract the concrete claims: behavior, state layout, commands, APIs,
   release shape, roles, sync contracts, and non-goals.
2. Find the smallest code or runtime evidence for each claim.
3. Classify each claim:
   - **aligned**
   - **spec ahead of code**
   - **code ahead of spec**
   - **contradiction**
4. Propose the smallest update to either the spec or code.

## Current Evidence Targets

Use these for this repo:

```bash
sed -n '1,260p' README.md
sed -n '1,220p' projects/app/src/cli.ts
sed -n '1,260p' projects/app/src/config/session-context.ts
sed -n '1,320p' projects/app/src/data/db/schema.ts
sed -n '1,260p' projects/app/src/runtime/scheduler/jobs.ts
sed -n '1,320p' projects/app/src/claude/agents/runs/execute-turn.ts
sed -n '1,260p' projects/app/src/routes/replicache.ts
sed -n '1,240p' config/scripts/build_release_assets.sh
sed -n '1,280p' config/scripts/install.sh
sed -n '1,260p' .github/workflows/situ-release.yml
```

Runtime verification:

```bash
mise run check
.agents/skills/situ-verify-local-distribution/scripts/local-release-smoke.sh
```

## Report Format

Group findings by spec. For each drift item include:

- claim
- evidence
- classification
- recommended action

Keep aligned claims brief. Spend detail on contradictions or spec/code drift.
