---
name: situ-policy-workflow-skill-shape
description: Use whenever adding, modifying, or reviewing a non-policy workflow skill under .agents/skills — procedural skills like situ-add-tool, situ-review-flow, situ-run-and-verify-evals.
---

# Workflow Skill Shape

Workflow skills (`.agents/skills/situ-<verb>/SKILL.md`) describe **how
to do something**. Policy skills (`.agents/skills/situ-policy-*/SKILL.md`,
governed by `situ-add-policy-skill`) describe **what must be true**.
Different shapes, different audiences.

## Why

A workflow skill is a recipe; the model loads it, follows the steps,
and verifies. A policy skill is a rubric; the model uses it to judge
whether code matches a contract. Mixing the two — procedural steps
inside a policy, or rubric checks inside a workflow — makes both
harder to use.

## Naming

- File: `.agents/skills/situ-<verb>/SKILL.md`. Verb-led name describes
  the action (`situ-add-tool`, `situ-review-flow`, `situ-audit-policies`,
  `situ-add-runtime-skill`).
- Frontmatter:

  ```yaml
  ---
  name: situ-<verb>
  description: Use when <triggering action> in this repo.
  ---
  ```

- Description is procedural: "Use when adding…", "Use when reviewing…",
  "Use when debugging…". Not "Use whenever the rule about X applies."

## Body shape

1. `# <Skill Title>` — short, readable.
2. Optional `## Goal` — one paragraph stating what the skill accomplishes
   and the calibration ("read the code; don't answer from memory").
3. `## <Section>` — the procedure, in the order the model should follow.
   Common sections:
   - `## Before Editing` / `## Evidence Pass` — read these files first.
   - `## Design Rules` / `## What To Check` — judgment guidance.
   - `## Verification` — concrete commands to confirm the result.
   - `## Reporting` — what to tell the user when done.
4. Concrete bash commands inside fenced ```bash blocks — paths and flags
   the model can run verbatim.
5. End with a short reporting expectation if the skill produces a result
   the user reads.

## Length

- Aim for **40–100 lines of body**. Workflows are usually longer than
  policies because they include commands and reading lists.
- Past 150 lines, consider splitting into a workflow + a reference
  document under `.agents/docs/`.

## Style

- Imperative voice ("Run …", "Read …", "Throw …").
- Lists of files to read use `sed -n '1,260p'` or `Read` cues so the
  model knows the budget.
- Cross-reference policies by full skill name when a workflow step
  has to honor a specific rule (`see situ-policy-mutations-via-runsyncedwrite`).
- Don't restate a policy's rules — link to the policy.

## Avoid

- A workflow skill formatted like a policy (`## Rules` + `## Avoid`) —
  use procedural sections instead.
- A description that triggers on a passive condition ("Use whenever
  errors are present in the code") — workflows fire on actions.
- Long preamble before the procedure — the model wants the steps first.
- A workflow that re-derives a policy's rules. Link to the policy.
- Inline tool installation steps. Tools are governed by `mise.toml`.

## See also

- `situ-add-policy-skill` — the counterpart for policy skills.
- `situ-spec-policy-maintenance` — overall `.agents/` maintenance.
