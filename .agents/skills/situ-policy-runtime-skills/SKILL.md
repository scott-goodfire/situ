---
name: situ-policy-runtime-skills
description: Use whenever adding, modifying, or reviewing runtime Claude skills under projects/app/src/claude/agents/skills/runtime — including SKILL.md edits, role bindings, evals, or release packaging.
---

# Runtime Skills

Runtime skills are Claude Skills loaded by Situ's Managed Agents.

## Rules

- Source lives under `projects/app/src/claude/agents/skills/runtime/`.
- Each skill directory contains `SKILL.md` with `name` and `description`
  frontmatter.
- `claudeAgentSkillDefinitions` (in `claude/agents/skills/definitions.ts`)
  registers every runtime skill. `registry.ts` is the public facade for skill
  params, diagnostics, and sync.
- Role blueprints reference only skills valid for that role.
- `evals/runtime-skills.eval.ts` covers required markers for each role skill.
- Release builds copy runtime skills to `share/skills`.
- `situ doctor --json` reports skill source and missing files without
  network calls.

## Avoid

- A skill describing tools the role doesn't have.
- A skill present in source but not packaged in release tarballs.
- Skill upload state stored in SQLite session state instead of runtime
  state under `SITU_HOME`.

## See also

- `situ-policy-agent-role-folder-shape`
- `situ-policy-agent-tool-surface`
- `situ-policy-eval-strategy`
