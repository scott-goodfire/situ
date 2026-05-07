# Agents Surface

This repo uses `.agents/` as the durable instruction surface for future agents.
Keep it small, numbered, and load-bearing.

## Layout

```text
.agents/
  docs/
    <doc-name>/DOC.md
  policies/
    0001-some-policy/POLICY.md
  skills/
    <skill-name>/SKILL.md
  specs/
    0001-some-spec/SPEC.md
```

## Specs

Specs define product or architecture contracts. They should explain what future
implementation should preserve and what is intentionally out of scope.

Use:

```text
.agents/specs/0001-some-name/SPEC.md
```

Add new specs with the next zero-padded number.

## Policies

Policies are review rubrics. They should prevent recurring mistakes and make
future reviews more concrete.

Use:

```text
.agents/policies/0001-some-name/POLICY.md
```

Add new policies with the next zero-padded number.

## Docs

Docs are durable explanations that are not product contracts or review rubrics.
Use them for architecture notes, workflow docs, and repo conventions.

Use:

```text
.agents/docs/some-doc/DOC.md
```

Current docs:

- `.agents/docs/agents-surface/DOC.md` - conventions for the `.agents` layer
- `.agents/docs/autoresearch-reference/DOC.md` - reference for Karpathy's autoresearch project, the canonical autoresearch loop Situ benchmarks against
- `.agents/docs/evals-strategy/DOC.md` - strategy for code-first evals, fixture worlds, Logfire reporting, and behavioral checks
- `.agents/docs/failure-modes/DOC.md` - catalog of autoresearch failure modes Situ exists to detect
- `.agents/docs/loose-models-tool-calls/DOC.md` - guideline for loose semantic models, tool-call-shaped execution, DBOS durability, and hook-driven observability
- `.agents/docs/milestones/DOC.md` - current milestone and benchmark context
- `.agents/docs/testing-strategy/DOC.md` - current checks and smoke strategy

## Skills

This repo has two different skill families. Keep them separate.

### Developer Agent Skills

Developer agent skills live in `.agents/skills/`. They are repeatable workflows
for Codex or another coding agent maintaining this repository. Use them when a
future developer agent should follow a specific procedure, such as adding and
linting specs and policies.

Do not put Situ runtime-agent methodology here. `.agents/skills/` is loaded by
the coding agent working on the repo, not by Situ's Manager, Researcher,
Scientist, or Critic agents while an autoresearch run is executing.

Use the spec/policy maintenance skill after changing specs, policies, docs, or
skills:

```text
.agents/skills/situ-spec-policy-maintenance/SKILL.md
```

Linting is intentionally LLM-driven. The skill asks the agent to review
numbering, indexes, policy frontmatter, link plausibility, and the quality of
the spec/policy content.

Use the curate-meta-layer skill when the goal is broader entropy reduction:

```text
.agents/skills/curate-meta-layer/SKILL.md
```

It reviews specs, policies, docs, skills, recent conversation context, and
recent commits/diffs for artifacts to update, combine, remove, rewrite,
simplify, add, or leave alone.

Use the Playwright Storybook screenshots skill when reviewing the web UI:

```text
.agents/skills/playwright-storybook-screenshots/SKILL.md
```

It captures fixture-driven Storybook screenshots into `/tmp` and documents the
Playwright MCP setup for interactive browser inspection.

Use the run-and-verify evals skill when running live Situ eval suites and
checking Logfire:

```text
.agents/skills/run-and-verify-evals/SKILL.md
```

It documents local eval commands, required credentials, and the distinction
between Logfire write tokens and read-token/UI verification.

Use the Logfire skill when checking CLI auth, creating read tokens, querying
trace data, or explaining how the user should log in:

```text
.agents/skills/use-logfire/SKILL.md
```

It keeps Logfire auth, project selection, token handling, query, and UI
verification steps in one place.

Use the Logfire query skill when read-token access is already available and the
task is to query trace records for Situ harness or eval runs:

```text
.agents/skills/query-logfire/SKILL.md
```

Use the run-review skill when autopsying a completed or active Situ run from a
TUI screenshot, workspace path, session id, local SQLite state, workspace diff,
and Logfire traces:

```text
.agents/skills/review-situ-run/SKILL.md
```

### Runtime Agent Skills

Runtime agent skills live in:

```text
projects/harness/src/situ/harness/agent_skills/
```

These are exposed through Pydantic AI skills to Situ's own runtime agents.
Use them when Manager, Researcher, Scientist, or Critic should be able to load
reusable methodology during a run with `load_skill(skill_name=...)`.

Current runtime skills are role-scoped:

- `agent_skills/manager/` - Manager planning and task-decomposition methods.
- `agent_skills/researcher/` - Researcher methods for codebase mapping, web
  research, prior-art synthesis, and hypothesis handoff.
- `agent_skills/shared/` - methods usable by more than one runtime role.

Do not add runtime skills to `.agents/skills/`. Do not add developer-agent
maintenance workflows to `agent_skills/`.

Add or update a runtime skill when:

- the method is reusable across runs, not just a one-off prompt tweak;
- the method is too detailed to keep in the role prompt;
- the skill teaches how to do work, while durable output still goes through
  normal Situ tools such as `create_analysis`, `create_hypothesis`,
  `create_task`, `add_task_comment`, or `link_task_entity`;
- the role should explicitly load the method in traces.

Prefer progressive disclosure. The base role prompt may advertise skill names
and descriptions, but full instructions should stay in the skill and be loaded
with `load_skill(skill_name=...)`.

When adding a runtime skill, update the role registry in
`projects/harness/src/situ/harness/agent_skills/registry.py`, keep package data
including markdown resources in `projects/harness/pyproject.toml`, and add or
update tests/evals that prove the intended role can discover or load the skill.
