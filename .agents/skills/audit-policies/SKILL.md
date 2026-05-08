---
name: audit-policies
description: >-
  Use when the user asks to check whether the codebase actually conforms to
  the policies in .agents/policies, find policy violations, or recommend
  which policy checks should be backed by automated tests. Different from
  curate-meta-layer (which audits the meta layer's own quality) and
  verify-specs-against-project (which audits spec ↔ code drift): this skill
  is a one-way audit of code against policy review rubrics.
---

# Audit Policies

## Overview

Use this skill to audit whether each policy under
`.agents/policies/*/POLICY.md` is actually being followed by the codebase.
The goal is to surface violations and to recommend which policy checks
deserve automated test coverage versus which are inherently judgment
calls that need a human review.

Policies are review rubrics (see
[`../../policies/DOC.md`](../../policies/DOC.md)). This skill is how an
agent stress-tests whether the rubric is in force, not whether the rubric
itself is well-written.

Default to proposing changes first. Apply changes only when the user
asks. The skill is a periodic hygiene pass, not a CI guard — the
mechanizable checks that *should* run automatically belong in tests
(under `projects/harness/tests/test_backend_invariants.py` or a new
suite), and one of this skill's outputs is a list of recommended new
tests.

## When To Use

- User asks "are we actually following our policies?", "what's drifting
  in the codebase?", or "which policies need test coverage?".
- After adding a new policy — to check whether the codebase already
  satisfies it and to decide if the load-bearing checks should ship as
  tests.
- Periodic hygiene — pair with `verify-specs-against-project` and
  `curate-meta-layer` for a full meta sweep.
- Before reorganizing or renumbering policies — first confirm which are
  in force and which are aspirational.

## Process

### 1. Frame the audit

- List every policy: `ls .agents/policies/*/POLICY.md`.
- Pull the policy index: `.agents/policies/DOC.md`.
- Decide scope: a single policy by number/name, a category (e.g. all
  policies governing tools), or every policy. For "every policy",
  delegate per-policy work to `Explore` subagents in parallel — one
  subagent per policy, briefed with the policy's full text.

### 2. Per-policy evidence pass

For each policy, run this loop:

- Read the `Required Checks` and `Red Flags` sections.
- For each check or flag, classify it as **mechanizable** (greppable,
  testable, deterministic) or **judgment** (requires reading code in
  context and forming an opinion). Many checks have both a mechanizable
  surface and a judgment layer; record both.
- For each mechanizable check, actually run it. Use grep, find, ast
  walks, or quick scripts. Example targets:
  - "Every tool folder has `__init__.py + models.py + tool.py`" → `find`
    with file pattern check.
  - "No stale enum tokens (`open`, `closed`) in tool docstrings" →
    `grep -rn` against the docstring lines.
  - "Voice-bearing tools have ≥3 `<example>` blocks" → covered by
    `tests/test_voice.py`; verify the test exists and is in the test
    matrix.
  - "Every executable `TaskKind` has a default runtime skill" →
    enumerate task kinds, walk `agent_skills/<role>/`.
- For each judgment check, sample 3–5 representative artifacts (tools,
  specs, prompts) and form an opinion. Cite the file:line you read.

### 3. Classify each finding

Bucket each check or flag into one of:

- **Aligned and tested** — check is satisfied AND a test enforces it.
  No action.
- **Aligned but untested** — check is satisfied today, but no test
  guards it. Recommend a test if the check is mechanizable and
  load-bearing.
- **Violation** — code does not satisfy the check. Report file:line
  evidence and propose a targeted fix.
- **Judgment call needed** — check is not mechanizable; surface a
  short question for the user. Do not make the call yourself.
- **Policy ahead of code** — policy describes a check that depends on
  code or conventions not yet in place. Either the policy should defer
  the check explicitly, or the missing code should be filed as work.

### 4. Recommend tests for the load-bearing mechanizable gaps

Most of this skill's value is in identifying which "Aligned but
untested" checks should become tests. Suggest concrete test files and
assertion shapes. Follow the existing pattern: invariant-style tests
live in `tests/test_backend_invariants.py`; voice-related tests in
`tests/test_voice.py`; tool-specific tests in `tests/test_tools.py`.

## Output Shape

Use this structure:

```md
## Policy Audit

Ground truth checked:
- Policies reviewed: <count or names>
- Code surfaces touched: <brief list>
- Test files consulted: <list>

### Per-Policy Findings

#### 0017-agent-tool-surface

- [aligned, tested] Tool folder layout — covered by
  `test_situ_tool_folders_match_toolset_registration`.
- [aligned, untested] Every tool subclasses `BaseSituTool` — no test;
  recommend adding one (see "Recommended new tests" below).
- [violation] `tools/foo/bar/tool.py:42` uses positional args; policy
  requires keyword-only.
- [judgment] "Tool names should describe a product action" — sampled
  10 tools; all read product-shaped. No flag.

#### 0036-tool-docstrings

- [aligned, tested] Voice-bearing tools have ≥3 examples — covered by
  `test_voice_bearing_tools_have_at_least_three_examples`.
- [aligned, untested] No stale `open`/`closed` enum tokens in tool
  docstrings — clean today; recommend a grep test.
- ...

### Recommended new tests

1. **`test_no_stale_lifecycle_tokens_in_tool_docstrings`** in
   `test_backend_invariants.py` — grep tool docstrings for `open`,
   `closed`, etc. The targeted gap was the lifecycle rename drift
   already cleaned up; the test prevents regression.
2. ...

### Judgment calls for the user

1. **<policy>**: <one-line question grounded in concrete evidence>.
2. ...

## Recommendation

<which violations to fix now, which tests to add, which judgment calls
to discuss; default is "review this list, then ask me to apply".>
```

Omit empty buckets unless their absence is meaningful.

## Related

- [`../../policies/DOC.md`](../../policies/DOC.md) — policy index and
  review style
- [`../verify-specs-against-project/SKILL.md`](../verify-specs-against-project/SKILL.md)
  — the spec-side counterpart of this skill
- [`../curate-meta-layer/SKILL.md`](../curate-meta-layer/SKILL.md) —
  broader meta-layer entropy review (not policy-specific)
- [`../situ-spec-policy-maintenance/SKILL.md`](../situ-spec-policy-maintenance/SKILL.md)
  — for adding, renumbering, or rewriting individual policies after
  this audit identifies a gap
