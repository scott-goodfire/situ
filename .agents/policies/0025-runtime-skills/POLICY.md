---
title: Runtime Skills
status: active
---

# Policy: Runtime Skills

## Applies To

Runtime agent skills under
`projects/harness/src/situ/harness/agent_skills/**`, Pydantic AI skills wiring,
role prompts that advertise skills, package-data configuration, and evals that
assert runtime skill loading.

## Rule

Runtime skills are reusable methodology for Situ's Manager, Researcher,
Scientist, and Critic agents during an autoresearch run. They are separate from
developer-agent skills under `.agents/skills/`, and they do not replace normal
Situ record tools.

Skills may teach an agent how to do work. Durable findings still flow through
explicit tools such as `get_project_board`, `get_task`, `create_analysis`,
`create_hypothesis`, `create_experiment`, `add_task_comment`, and
`link_task_entity`.

## Required Checks

- Runtime skills live under
  `projects/harness/src/situ/harness/agent_skills/<role-or-shared>/<skill-name>/SKILL.md`.
- Developer-maintenance skills stay under `.agents/skills/`. Do not mix the two
  skill families.
- Runtime skill frontmatter includes `name` and `description`.
- Skill names are stable, kebab-cased, and unique within the role/shared
  namespace.
- Role prompts may advertise skill names and short descriptions, but detailed
  methodology should be loaded with `load_skill(skill_name=...)`.
- Prompts should still pass only minimal bootstrap IDs and constraints. A skill
  should tell the agent which explicit read tools to call, not rely on hidden
  injected state.
- Every agent-executable `TaskKind` has a default task-kind runtime skill, or
  the change adding that task kind records why the role prompt/toolset is
  enough.
- Task-kind skills describe the expected procedure, required state reads,
  durable outputs, links, comments, completion behavior, and role boundaries.
- Skills do not grant capabilities outside the role's normal toolset. For
  example, a Scientist skill should not tell the agent to perform web research
  unless Scientist has that tool by design.
- Skills that influence durable state should name the ordinary Situ tools that
  write that state.
- `agent_skills/registry.py` registers available skills and role access.
- Package data includes markdown skill resources in
  `projects/harness/pyproject.toml`.
- Deterministic tests discover registered skill names and resources. Live evals
  assert `load_skill` calls when behavior depends on a skill.

## Red Flags

- Putting runtime-agent methodology in `.agents/skills/`.
- Putting coding-agent maintenance workflows in the harness runtime skill tree.
- A giant role prompt that should be a loadable runtime skill.
- A skill that tells an agent to write files or durable records outside the
  normal tool surface.
- A skill that assumes the full task, project board, or recent state was
  injected into the prompt.
- Duplicate or near-duplicate skills for the same task kind.
- Adding a task kind without a default skill or explicit reason.
- Runtime skills shipped as markdown files but missing from package data.
- Skill-loading behavior that is important to a role but not covered by any
  deterministic discovery test or realistic eval.

## Review Questions

- Is this reusable role methodology rather than one-off prompt text?
- Is the skill in the correct skill family?
- Does the skill preserve explicit tool reads and writes?
- Does it make the agent's trace clearer through `load_skill` calls?
- Is the role still bounded to its intended responsibilities?
