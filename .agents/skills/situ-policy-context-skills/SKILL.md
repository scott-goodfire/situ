---
name: situ-policy-context-skills
description: Use whenever adding, modifying, reviewing, or validating situ-context-* skills that teach agents how to explore this codebase.
---

# Context Skills

Context skills live at `.agents/skills/situ-context-*/SKILL.md` and teach
fresh agents how to explore an area of the repo.

## Why

These skills should reduce stale-memory answers. They are not miniature
architecture docs; they are repeatable discovery procedures that point
agents at source, docs, tests, evals, and policies.

## Rules

- Names use the `situ-context-<area>` family prefix. This is an explicit
  exception to the verb-led workflow naming convention in
  `situ-policy-workflow-skill-shape`.
- The skill body is procedural but tool-agnostic: goal, concepts to
  locate, what to learn, investigation pattern, verification, and reporting.
- Architecture content belongs in code, `.agents/docs`, or existing
  runtime skills. A context skill may point to those files but should not
  copy their content.
- Feature additions/removals update the relevant context skill when they
  change the source entry points, verification commands, or discovery
  path an agent should use.
- Prefer resilient exploration by symbols, nouns, routes, status names,
  tool names, and package concepts. Exact filenames and shell commands
  are not the foundation of the skill.
- Every context skill must produce a file-backed answer: files read,
  flow understood, checks/evals to run, and unknowns.
- Validate broad context changes by spawning a fresh subagent, having it
  run the context skill, then asking feature-level questions it can
  answer from current files.

## Avoid

- Long static summaries of the product or architecture inside the skill.
- A context skill that skips source reads and only names docs.
- Brittle read recipes built from fixed filenames, shell commands, or
  line ranges.
- Commands that require network access or user secrets for basic
  orientation.
- Hiding uncertainty; a context skill should require agents to state
  which branches they did not inspect.

## See also

- `situ-policy-workflow-skill-shape`
- `situ-policy-agents-doc-shape`
- `situ-curate-meta-layer`
