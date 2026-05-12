---
name: situ-add-runtime-skill
description: Use when adding or changing a runtime Claude Managed Agent skill loaded by Situ Manager, Scientist, or Verifier.
---

# Situ Add Runtime Skill

## Scope

Runtime skills are Claude Skills uploaded through the Anthropic beta Skills API
and attached to Situ Managed Agents. They are not Codex developer skills.

Current runtime skill source lives under:

```text
projects/app/src/claude/agents/skills/runtime/<skill-name>/SKILL.md
```

Installed releases read the same bundles from `share/skills`. The source root
can be overridden with `SITU_AGENT_SKILLS_DIR`.

## Before Editing

Read the runtime skill wiring:

```bash
sed -n '1,260p' projects/app/src/claude/agents/skills/registry.ts
sed -n '1,180p' projects/app/src/claude/agents/skills/runtime-paths.ts
sed -n '1,180p' projects/app/src/claude/agents/skills/state.ts
sed -n '1,120p' projects/app/src/claude/agents/roles/manager/blueprint.ts
```

## Add Or Update A Skill

1. Put the skill in a kebab-cased directory with a `SKILL.md`.
2. Use frontmatter:

   ```yaml
   ---
   name: situ-some-runtime
   description: Runtime guidance for <role/purpose>.
   ---
   ```

3. Keep the body procedural: what to read, what tools to call, what durable
   records to write, and when to complete or fail the active task.
4. Respect role boundaries. Skills do not grant tools; they only guide use of
   the tools already exposed to the role.
5. Register the skill in `claudeAgentSkillDefinitions`.
6. Add the skill name to the appropriate role blueprint `skillNames`.
7. Extend
   `projects/app/src/claude/agents/skills/runtime/runtime-skills.test.ts`
   with marker coverage for the new skill.

## Verify

Fast local checks:

```bash
bun --filter=@situ/app run test:skills
bun --filter=@situ/app run check:cli
SITU_HOME="$(mktemp -d)" bun run projects/app/src/cli.ts doctor --json
```

Network sync preflight, when an Anthropic key is configured:

```bash
situ skills sync --json
```

Distribution check:

```bash
.agents/skills/situ-verify-local-distribution/scripts/local-release-smoke.sh
```

Report whether the skill was only locally checked or actually uploaded.
