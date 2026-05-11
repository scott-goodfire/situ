---
name: situ-curate-meta-layer
description: Use when reducing entropy in this repo's .agents layer by reviewing skills, specs, docs, recent changes, and recurring workflows for stale or missing guidance.
---

# Situ Curate Meta Layer

## Goal

Keep `.agents/` useful as the app evolves. The output is a short set of
recommendations to update, combine, remove, rewrite, simplify, add, or
leave alone. Edit files only when the user asks.

For a complete map of how the meta-layer is organized, see
`.agents/docs/meta-layer/DOC.md`. This skill is the procedural curation
loop on top of that map.

## Inputs

Start with:

```bash
git status --short
git diff --stat
git log --oneline -20
find .agents -maxdepth 4 -type f | sort
find .agents/skills -maxdepth 1 -type d -name 'situ-policy-*' | sort
find .agents/skills -maxdepth 1 -type d -not -name 'situ-policy-*' | sort
find .agents/specs -name SPEC.md -print 2>/dev/null | sort
find .agents/docs -name DOC.md -print 2>/dev/null | sort
```

Then read only the files relevant to the user's question or the recent
change. Pair this skill with the mechanical checks:

- `situ-lint-policies` — structural lint of the policy skill set
- `situ-audit-policies` — sweep the codebase against every policy

Curation is the judgment-heavy work the lints can't do.

## Buckets

- **Update**: useful but stale or incomplete.
- **Combine**: overlapping instructions would be clearer as one artifact.
- **Remove**: obsolete, misleading, or redundant.
- **Rewrite**: right purpose, wrong level of detail or clarity.
- **Simplify**: too broad or too implementation-heavy.
- **Add**: recurring workflow or risk is not covered.
- **Leave alone**: default bucket unless evidence says otherwise.

## Things to watch

- Skill names start with `situ-`. Policy-skill names start with
  `situ-policy-` (no numbers).
- Skills point at current TypeScript/Bun paths in `projects/app/src`,
  not historical layouts.
- `## See also` links resolve — `situ-lint-policies` catches dangling
  refs mechanically; verify the _intent_ (small specific → large
  umbrella, or mutual where both directions make sense).
- Mention of a tool implies the tool is wired in `mise.toml` /
  `.oxlintrc.json` / etc., or appears in the deferred-automation list
  in `situ-spec-policy-maintenance`.
- Workflow skills follow `situ-policy-workflow-skill-shape` (Goal /
  Procedure / Verification, not Rules / Avoid).
- Policy skills follow `situ-add-policy-skill` (Rules / Avoid /
  See also, optional Why / Exceptions).

## Common findings

When curating finds something, it usually fits one of these:

- A tool got renamed or replaced; one or two skills still mention the
  old name.
- A workflow skill duplicates content from a policy skill — the
  workflow should link to the policy, not restate the rules.
- A new policy reuses a description pattern from a near-sibling
  policy — make the descriptions distinct so the model can pick one
  unambiguously.
- Cross-references trend one-way when both directions would be
  natural (small specific → large umbrella is fine; sibling pairs
  should reciprocate).
- The deferred-automation list grew faster than wired automation —
  re-evaluate the trigger for the oldest deferred item.

## Output

Concise findings with file paths. For each proposed change, state why
it reduces entropy and whether it is safe to apply immediately or
should wait for more product/runtime stability. If the user asks for
fixes (not just findings), apply them and re-run
`situ-lint-policies` to verify nothing broke.

## See also

- `situ-lint-policies` — structural checks the curation skill skips
- `situ-audit-policies` — codebase sweep against all policy skills
- `situ-spec-policy-maintenance` — directory layout + deferred list
- `situ-add-policy-skill` — policy-skill authorship rules
- `situ-policy-workflow-skill-shape` — workflow-skill authorship rules
