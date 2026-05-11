---
name: situ-policy-prose-quality
description: Use whenever editing markdown (SKILL.md, README, DOC.md), reviewing typos in source identifiers or strings, or wiring prose-quality automation.
---

# Prose Quality

Two cheap, fast Rust/Node tools enforce that the prose layer of the
repo — policy skills, READMEs, docs, source comments, identifiers —
stays clean.

| Tool                  | What it catches                                                               | Surface                                                         |
| --------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **markdownlint-cli2** | Heading order, list shape, fence/blank-line consistency, code-fence languages | All `*.md` under `.agents/`, root `*.md`, per-workspace READMEs |
| **typos**             | Source-code-aware spell checker, low-FP, sub-second                           | All TS/MD source plus prose; fixtures and lockfile are excluded |

## Why

Skill prose **is the product** for the agent layer — typos and broken
heading structure mislead the model. markdownlint catches structural
drift before review, typos catches the obvious spelling errors that
copyedit doesn't always catch. Both are fast enough to run on every
PR, both are zero-config-to-start.

## Tasks

```bash
mise run markdownlint            # lint markdown structure
mise run typos                   # spell-check sources and prose
mise run check                   # both run as part of the full check pipeline
```

Auto-fix:

```bash
bun x markdownlint-cli2 --fix    # apply auto-fixable rules in place
typos --write-changes            # apply typos' suggested fixes
```

Run before committing typos changes — `typos` may apply a "fix" that
isn't right when an identifier is intentional but unrecognized.

## Configuration

**`.markdownlint-cli2.jsonc`** at the repo root:

- `globs` — files to lint (`.agents/**/*.md`, `*.md`, `projects/**/README.md`)
- `ignores` — `node_modules`, `dist`, `.fallow`, `.tanstack`
- `config.MD013/MD024/MD041/MD033/MD026/MD034: false` — disabled rules
  that conflict with our skill shape (line length, repeated headings
  like `## Avoid` / `## See also`, frontmatter-before-H1, intentional
  inline HTML, trailing punctuation in section titles, bare URLs)

**`_typos.toml`** at the repo root:

- `default.extend-words` — project nouns typos doesn't know
  (`evalite`, `situ`, `oxlint`, `oxfmt`, `tsgo`, `mitata`)
- `files.extend-exclude` — fixtures (intentional short prefix codes
  like `workitem_01`, `task_plan_01`), lockfile, dist/, node_modules/

When typos flags a real word it doesn't recognize, add it to
`extend-words`. When it flags a whole class of intentional codes
(fixture IDs, generated file content), add a glob to
`files.extend-exclude`.

## Rules

- New `.md` files (skills, specs, docs, READMEs) pass `mise run markdownlint`
  and `mise run typos` before commit.
- `_typos.toml` and `.markdownlint-cli2.jsonc` are the only places
  rules / allowlists live — no per-file pragmas or HTML comments.
- Project nouns added to `extend-words` get a one-line reason in the
  TOML if non-obvious (e.g., `mitata = "mitata"  # benchmark library`).
- markdownlint disable rules require a comment explaining what
  conflict prompted the disable (we have 6 today, all justified).
- `--fix` / `--write-changes` runs are reviewed before commit — typos
  in identifiers can be intentional naming.

## Avoid

- Adding a new word to `extend-words` to silence one false positive
  on a true typo — fix the word instead.
- Disabling a markdownlint rule because a single file violates it —
  fix the file or scope the disable to that file.
- Skipping `typos` on PRs touching `_typos.toml` — silently expanding
  the allowlist defeats the gate.
- Editing markdown by hand to satisfy markdownlint when `--fix` would
  do it correctly — autofix is the path; manual fixes drift.

## See also

- `situ-policy-file-naming` — kebab-case file conventions
- `situ-add-policy-skill` — policy-skill structural rules
- `situ-lint-policies` — meta-lint of the policy set
