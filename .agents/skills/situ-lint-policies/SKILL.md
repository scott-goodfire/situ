---
name: situ-lint-policies
description: Use when the policy set itself needs a consistency check — drift after a wave of edits, before adding many new policies, or as a periodic polish pass.
---

# Situ Lint Policies

Sweep `.agents/skills/*/SKILL.md` for internal consistency: broken
cross-references, stale section names, missing standard sections,
format mangling, voice drift. This skill audits the policy **set**,
not the codebase. For codebase compliance, use `situ-audit-policies`
(sweep) or `situ-run-policy-skill` (one policy).

The full mechanical sweep is wired as `mise run lint:policies` and
runs as part of `mise run check`. The script lives at
`scripts/lint-policies.sh`. The checks below mirror it — run them
individually when narrowing in on one kind of drift.

## Goal

Keep the 50+ policy files coherent as a unit: every cross-reference
resolves, every required section is present, voice is uniform, and the
oxfmt formatter doesn't have anything to complain about.

## Procedure

Run each check, fix what surfaces, re-run.

### 1. Cross-references resolve

```bash
# Every situ-policy-* mentioned anywhere in a SKILL.md should be a real folder.
# Sweeps both policy skills and workflow skills — drift hides in either.
for ref in $(rg --no-filename --only-matching --replace '$1' \
    '`(situ-policy-[a-z-]+)`' .agents/skills/*/SKILL.md \
    | sort -u); do
  test -d ".agents/skills/$ref" || echo "MISSING: $ref"
done
```

If something's missing, either add a back-reference target or remove
the dangling link.

### 2. Stale section names

```bash
rg -l 'Required Checks|Red Flags' .agents/skills \
  --glob '!**/situ-lint-policies/**' \
  || echo "ok: all renamed to Rules / Avoid"
```

Current convention is `## Rules` and `## Avoid`. Anything older is drift.

### 3. Backtick mangling from oxfmt

```bash
rg -nP '\\`' .agents/skills \
  --glob '!**/situ-lint-policies/**' \
  || echo "ok: no escaped backticks"
```

oxfmt collapses lines containing backslash-backtick. Use double-backtick
`` `code` `` form for inline code that contains backticks. If a line
trips this check and rewriting isn't possible, use plain prose
("backslash-backtick") in the documentation.

### 4. Description voice

```bash
# Should be "Use whenever ..." — not "Use when ..." (too narrow).
rg --no-filename "^description: Use when " \
  .agents/skills/situ-policy-*/SKILL.md \
  || echo "ok: pushy"
```

Anthropic's `skill-creator` recommends descriptions broad enough to
trigger on adjacent actions. "Use when" tends narrow; "Use whenever"
tends pushy.

### 5. Description length

```bash
# Sweeps every SKILL.md, policy + workflow.
for f in .agents/skills/*/SKILL.md; do
  d=$(grep "^description:" "$f" | sed 's/description: //')
  [ ${#d} -gt 240 ] && echo "$f (${#d} chars)"
done
```

Aim for ~25 words. Past 240 chars, the description is doing a
policy's job.

### 6. Standard sections present

```bash
for f in .agents/skills/situ-policy-*/SKILL.md; do
  grep -q "^## Avoid" "$f" || echo "no Avoid: $f"
  grep -q "^## See also" "$f" || echo "no See also: $f"
done
```

`## Avoid` and `## See also` are mandatory. `## Why`, `## Exceptions`,
`## Slicing target`, `## Folders covered today` are optional.

### 7. All-caps anti-pattern

```bash
# Sweeps all skills — workflow skills should also avoid musty MUSTs.
rg "ALWAYS|NEVER" .agents/skills/*/SKILL.md \
  || echo "ok: no musty MUSTs"
```

Per Anthropic: "if you find yourself writing ALWAYS or NEVER in all
caps … reframe and explain the reasoning" instead.

### 8. One-way cross-references

For each policy, check that obvious siblings link back. If `policy-A`
lists `policy-B` in `## See also`, `policy-B` usually should reciprocate
unless the relationship is genuinely directional (small specific →
large umbrella).

```bash
# Spot-check by listing each policy's See also and reading the matrix.
for f in .agents/skills/situ-policy-*/SKILL.md; do
  echo "=== $(basename $(dirname $f)) ==="
  grep -A 6 "^## See also" "$f" | grep "^- "
done
```

### 9. Format check

```bash
bun x oxfmt --check .agents
```

Anything mangled goes through `bun x oxfmt <file>`. If the result still
looks wrong, the line probably uses backslash-backtick escape and
needs a double-backtick rewrite (see check 3).

## Reporting

One-line summary per fix: which check surfaced the issue, which file
was edited, what changed. If a fix changes a policy's intent (not just
formatting), call it out so the user can review.

## When to skip

This skill audits the **policy set**, not the code. If the question is
"does the codebase comply with our rules", use `situ-audit-policies`
(sweep) or `situ-run-policy-skill` (one rule).

## See also

- `situ-add-policy-skill` — how to write a new policy
- `situ-run-policy-skill` — audit one policy against code
- `situ-audit-policies` — audit all policies against code
- `situ-spec-policy-maintenance` — broader `.agents/` upkeep
