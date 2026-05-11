---
name: situ-policy-spec-shape
description: Use whenever adding, modifying, or reviewing a spec under .agents/specs — product contracts, architecture commitments, or end-state behavior we want to lock in.
---

# Spec Shape

`.agents/specs/NNNN-<name>/SPEC.md` is the durable record of "what must
be true" for a product or architectural contract.

```text
.agents/specs/README.md
.agents/specs/0001-some-contract/SPEC.md
.agents/specs/0002-another-contract/SPEC.md
```

## Why

Specs differ from policies (review rubrics) and docs (long-form
references): a spec describes the **end state** we've committed to.
The audience is anyone deciding whether a change matches the contract;
the question they're answering is "is the system still doing what we
said it would?".

## Rules

- Folder: `.agents/specs/NNNN-<name>/SPEC.md`. NNNN is a 4-digit
  zero-padded sequence (`0001`, `0002`); names are kebab-case.
- File: `SPEC.md` with `# H1` matching the spec name.
- Front matter: `title`, `status: draft | active | deprecated`.
- Body sections (in order):
  1. **Context** — why the spec exists, what problem prompted it.
  2. **Contract** — what must be true. Numbered or bulleted statements
     that can be checked against code or runtime state.
  3. **Review criteria** — concrete checks reviewers run when this spec
     is touched (e.g., "the tarball still includes `share/skills`").
  4. **Out of scope** — explicit non-commitments.
- `.agents/specs/README.md` lists every spec with one-line summaries.
- Specs reference policies (`see situ-policy-distribution-install`) but
  never restate them.

## Avoid

- A spec that reads like a TODO list or implementation diary —
  contracts describe end-state, not steps.
- A spec without a numbered prefix.
- A spec that duplicates a policy's `## Rules` — the spec says **what**
  must be true; the policy says **how to review** it.
- A spec missing review criteria — without them, "active" means nothing.

## See also

- `situ-policy-agents-doc-shape`
- `situ-spec-policy-maintenance`
