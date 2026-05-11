---
name: situ-policy-agent-role-folder-shape
description: Use whenever creating, modifying, or reviewing a Managed Agent role under projects/app/src/claude/agents/roles — including new role folders, blueprint changes, or system prompt edits.
---

# Agent Role Folder Shape

Each role lives in `claude/agents/roles/<role>/` with exactly two files:
`blueprint.ts` (the role definition) and `system.ts` (its system prompt).

## Rules

- New roles match the verified task tree roles: `manager`, `scientist`,
  `verifier`.
- Shared role machinery (`index.ts`, `models.ts`, `registry.ts`, `types.ts`) lives in the parent `roles/` folder.
- Role-specific runtime skills live at `claude/agents/skills/runtime/situ-<role>-runtime/SKILL.md`, not inside the role folder.
- Blueprints reference only tools and skills valid for that role.

## Avoid

- A role folder gains a file the others don't have.
- Role-specific helpers leak into the parent `roles/` machinery.
- A blueprint references a tool or skill not declared for that role.

## See also

- `situ-policy-agent-tool-surface`
- `situ-policy-runtime-skills`
