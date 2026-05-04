---
name: almanac-spec-policy-maintenance
description: Use when adding, renumbering, updating, or linting Almanac .agents specs and policies. Covers numbered SPEC.md and POLICY.md directories, policy frontmatter, indexes, and LLM-driven review of spec/policy quality.
---

# Almanac Spec Policy Maintenance

## Overview

Use this skill for changes to `.agents/specs/`, `.agents/policies/`,
`.agents/docs/`, or this repo's `.agents/skills/`.

The goal is to keep the agent surface small, numbered, discoverable, and useful.

## Add Or Update A Spec

1. Read `.agents/policies/0009-good-specs/POLICY.md`.
2. Read adjacent specs in `.agents/specs/*/SPEC.md`.
3. Add a new spec only when it captures a durable product or architecture
   contract.
4. Use the next numbered directory:
   ```text
   .agents/specs/0010-some-name/SPEC.md
   ```
5. Update `.agents/specs/README.md`.
6. Run the LLM lint workflow in this skill.

Specs should explain scope, intent, deferred work, and reviewable criteria. Do
not put implementation plans in specs unless they define a boundary.

## Add Or Update A Policy

1. Read `.agents/policies/0009-good-specs/POLICY.md` if the policy affects
   specs.
2. Read similar policies in `.agents/policies/*/POLICY.md`.
3. Add a policy only when it prevents a recurring mistake or makes reviews more
   concrete.
4. Use the next numbered directory:
   ```text
   .agents/policies/0010-some-name/POLICY.md
   ```
5. Include frontmatter:
   ```yaml
   ---
   title: Human Title
   status: active
   ---
   ```
6. Update `.agents/policies/DOC.md`.
7. Run the LLM lint workflow in this skill.

Policies should be review rubrics, not generic documentation.

## Add Or Update A Doc

Use docs for durable explanations that are neither specs nor policies:

```text
.agents/docs/some-name/DOC.md
```

Keep docs linked from `AGENTS.md` or a relevant spec/policy when agents should
read them.

## LLM Lint Workflow

Linting is an agent review pass, not a deterministic script. Evaluate the
`.agents` surface as a human reviewer would.

Read:

1. `.agents/docs/agents-surface/DOC.md`
2. `.agents/specs/README.md`
3. `.agents/policies/DOC.md`
4. `.agents/policies/0009-good-specs/POLICY.md`
5. Changed specs, policies, docs, and skills

Check:

- Specs live at `.agents/specs/NNNN-kebab-name/SPEC.md`.
- Policies live at `.agents/policies/NNNN-kebab-name/POLICY.md`.
- Policy files include `title` and `status: active` or `status: inactive`
  frontmatter.
- Index files link to the current numbered paths.
- Specs meet the good-spec policy: clear purpose, intent, scope, deferred work,
  and reviewable criteria.
- Policies are concrete review rubrics, not generic documentation.
- Docs explain durable context that is not better as a spec or policy.
- Skills describe a repeatable workflow and do not depend on stale scripts.
- Links referenced in changed files are plausible and current.

Output:

```text
APPROVED
```

or:

```text
NOT APPROVED - <N> issue(s)
- <file>: <issue and recommended fix>
```

Do not treat formatting issues as failures unless they hurt discoverability or
future agent use.
