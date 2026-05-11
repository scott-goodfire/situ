---
name: situ-policy-agents-doc-shape
description: Use whenever adding, modifying, or reviewing a document under .agents/docs — long-form references, strategy notes, or supplementary material the policy skills don't cover.
---

# Agents Doc Shape

`.agents/docs/<topic>/DOC.md` holds long-form references that don't fit
inside a policy skill or spec.

```text
.agents/docs/<topic>/DOC.md
.agents/docs/<topic>/references/<extra>.md   # optional
```

## Why

Skills are short, directive review rubrics. Specs are end-state
contracts. Docs are the third bucket: prose that explains, surveys, or
documents — not enforces. Putting that prose into a skill body makes the
skill bloated; putting it into a spec misuses the spec format.

## Rules

- Folder: `.agents/docs/<topic>/`. Topic is kebab-case, descriptive
  (`evals-strategy`, `failure-modes`).
- Main file: `DOC.md`. Title in `# H1` matches the topic.
- Body uses ordinary prose with `## Section` headings — no required
  schema beyond H1 + topic intro.
- Long supporting material (transcripts, sample data, command
  references) goes under `references/` next to `DOC.md`.
- Cross-link to skills and specs by name when the reader is expected to
  follow up: `see situ-policy-eval-strategy`.

## Avoid

- A doc that duplicates a policy's `## Rules`. Link to the skill instead.
- A doc that codifies enforcement — that's a policy skill's job.
- Numbered doc folders (`0001-evals-strategy`). Docs are topical, not
  ordered.
- Inline code samples >50 lines — move to `references/`.

## See also

- `situ-policy-spec-shape`
- `situ-spec-policy-maintenance`
