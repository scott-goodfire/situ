---
name: situ-spec-policy-maintenance
description: Use when adding, renaming, updating, or linting Situ .agents specs, docs, or skills (including policy skills) in this repo.
---

# Situ Spec Policy Maintenance

Keep this repo's `.agents/` surface small, discoverable, and useful.
Create entries only when they capture durable product, engineering, or
review contracts.

## Directory layout

```text
.agents/specs/README.md
.agents/specs/0001-some-contract/SPEC.md
.agents/docs/some-topic/DOC.md
.agents/skills/situ-some-skill/SKILL.md
.agents/skills/situ-policy-some-rubric/SKILL.md
```

Skill names always use the `situ-` prefix. Review rubrics are skills
prefixed `situ-policy-` (no numbering) so they show up in the same skill
surface as workflows.

## Add or update a spec

Use specs for end-state product or architecture contracts.

1. Check existing specs:

   ```bash
   find .agents/specs -name SPEC.md -print 2>/dev/null | sort
   ```

2. Use the next numbered directory.
3. Keep the spec focused on what must be true, not an implementation diary.
4. Include review criteria that can be checked against code or runtime state.
5. Update `.agents/specs/README.md`.

## Add or update a policy skill

See `situ-add-policy-skill` for the full guidance — naming, frontmatter,
length, body shape, style.

## Add or update a workflow skill

Use skills for repeatable workflows. Keep them short and procedural.

```yaml
---
name: situ-some-skill
description: Use when <trigger>.
---
```

Long reference material lives in `.agents/docs` or a `references/` file,
not inside the skill body.

## Lint before finishing

```bash
find .agents -name SKILL.md -o -name SPEC.md -o -name DOC.md | sort
rg --pcre2 -n "^name: (?!situ-)" .agents/skills -g SKILL.md || true
bun x oxfmt --check .agents
mise run check
```

Check whether new files duplicate existing instructions, refer to paths
that exist, and distinguish source-mode behavior from installed/release
behavior.

## Deferred automation

The following automation categories are **explicitly not wired** today.
Each is a deliberate "not yet", not an oversight. Re-evaluate when the
named trigger fires:

- **Supply-chain scanning beyond `bun audit`** (Socket, OSV, Snyk,
  zizmor) — `mise run audit` runs `bun audit` as our CVE check; that's
  enough for a local-only app at this scale. Wire deeper scanning when
  we ship a publishable npm package or accept untrusted contributions.
- **Commit-message linting** (commitlint, conventional-commits) — only
  worth the friction once we wire release automation (changesets,
  release-please) that derives versions or changelogs from commit
  metadata.
- **Automated dependency updates** (Renovate, Dependabot) — useful
  once the workspace catalog drifts faster than a human-driven monthly
  bump can keep up. Today the catalog is small and intentional.
- **Branch protection / signed commits / conventional PR titles** —
  same family as commit-message linting; not gating any current
  workflow.
- **Atlas migrate lint** (destructive-migration prevention) —
  `drizzle/migrations/` is empty; the runtime path is `db/migrate.ts`.
  See `situ-policy-migration-safety` for the wire-when condition.
- **Mutation testing** (Stryker) — Bun's programmatic test API is
  blocking the runner; revisit when oven-sh/bun#26191 lands.
- **Type-coverage gating** (`type-coverage`, TypeStat) — replaced by
  oxlint type-aware rules at `error` severity; see
  `situ-policy-typescript-strictness`.
- **Test-coverage gating / thresholds** — `mise run coverage:app` and
  `mise run coverage:web` emit lcov reports under `.coverage/`, and
  `mise run coverage:summary` prints the bottom-N least-covered files
  for use as a _guide_ (find the next file worth testing). Hard
  thresholds in `mise run check` aren't wired: they punish refactors
  that legitimately reduce surface area and reward test padding. Wire
  thresholds when product behavior is stable enough that "lines
  added" is a credible quality signal.

## See also

- `situ-add-policy-skill` — full policy-skill authorship guide
- `situ-curate-meta-layer` — judgment-heavy curation loop
- `situ-lint-policies` — structural lint of the policy set
- `situ-audit-policies` — codebase sweep against every policy
- `.agents/docs/meta-layer/DOC.md` — prose explanation of how the
  layers fit together
