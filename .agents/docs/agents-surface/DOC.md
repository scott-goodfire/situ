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
- `.agents/docs/evals-strategy/DOC.md` - strategy for code-first evals, fixture worlds, Logfire reporting, and behavioral checks
- `.agents/docs/loose-models-tool-calls/DOC.md` - guideline for loose semantic models, tool-call-shaped execution, DBOS durability, and hook-driven observability
- `.agents/docs/milestones/DOC.md` - current milestone and benchmark context
- `.agents/docs/testing-strategy/DOC.md` - current checks and smoke strategy

## Skills

Skills are repeatable workflows for agents. Use them when a future agent should
follow a specific procedure, such as adding and linting specs and policies.

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
