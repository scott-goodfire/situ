---
name: curate-meta-layer
description: Use when the user invokes /curate-meta-layer or asks to reduce entropy in the repo's meta layer by reviewing specs, policies, skills, docs, recent conversation context, and recent commits/diffs for items to update, combine, remove, rewrite, simplify, or leave alone.
---

# Curate Meta Layer

## Overview

Use this skill to keep `.agents/` useful over time. The goal is to reduce meta
layer entropy: stale specs, overlapping policies, redundant docs, bloated skills,
missing conventions, and instructions that no longer match recent work.

Default to proposing changes first. Edit files only when the user asks to apply
the recommendations.

## Inputs To Review

Use the available current conversation context plus local repo evidence.

Read:

```bash
git status --short
git diff --stat
git log --oneline -20
find .agents/specs -name SPEC.md | sort
find .agents/policies -name POLICY.md | sort
find .agents/docs -name DOC.md | sort
find .agents/skills -name SKILL.md | sort
```

Then inspect the relevant files. Do not bulk-load everything if a targeted read
is enough; prefer indexes first.

## Evaluation Buckets

Classify recommendations into these buckets.

### Update

Use when an artifact is still useful but stale, incomplete, or mismatched with
recent product decisions.

### Combine

Use when two artifacts cover the same rule or concept and would be clearer as
one.

### Remove

Use when an artifact is obsolete, redundant, misleading, or no longer
load-bearing.

### Rewrite

Use when an artifact has the right purpose but the language is too vague,
overbuilt, or hard for future agents to apply.

### Simplify

Use when an artifact is directionally correct but too broad, too long, or too
implementation-heavy for the current stage.

### Add

Use sparingly. Add only when recent work reveals a recurring risk, durable
decision, or repeated workflow not covered by existing specs, policies, docs, or
skills.

### Leave Alone

This is the default. Most artifacts should remain unchanged unless there is a
concrete entropy reduction.

## Review Criteria

Check whether the meta layer:

- Reflects the latest product contract.
- Avoids duplicate concepts under different names.
- Keeps specs product-shaped rather than implementation-heavy.
- Keeps policies concrete enough for review.
- Keeps skills as repeatable workflows, not generic docs.
- Keeps docs reserved for durable explanation that is not a spec or policy.
- Preserves numbered spec/policy conventions.
- Avoids stale references to removed concepts or tools.
- Helps future agents act with less context, not more.

## Output Shape

Use this structure:

```md
## Meta Layer Curation

Ground truth checked:
- Recent conversation: <one-line summary or "current thread only">
- Git state: <clean/dirty + one-line diff summary>
- Agent surface: <counts of specs/policies/docs/skills reviewed>

### Update
1. **<artifact>** - <why> - <recommended change>

### Combine
1. **<artifact A> + <artifact B>** - <why> - <recommended target>

### Remove
1. **<artifact>** - <why>

### Rewrite
1. **<artifact>** - <why> - <rewrite focus>

### Simplify
1. **<artifact>** - <why> - <what to cut>

### Add
1. **<new artifact>** - <why now>

### Leave Alone
- **<artifact>** - <why it remains useful>

## Recommendation
<what is worth doing now, what should wait, and whether to apply changes>
```

Omit empty buckets unless their absence is itself useful. Keep recommendations
grounded in actual repo artifacts or current conversation decisions.
