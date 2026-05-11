# Situ Meta-Layer

This doc explains how the `.agents/` layer of Situ is organized and
maintained — the **system that maintains the system**. It's the prose
counterpart to `situ-spec-policy-maintenance` (the maintenance skill)
and `situ-lint-policies` (the structural lint).

If you want to add a rule, a tool, or a check, start here.

## What the meta-layer is

A loose hierarchy of automation laid on top of the codebase, each
layer answering a different question:

| Layer                         | Question it answers                                | Where it lives                                                                             |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Tools**                     | Did this code violate a mechanical rule?           | `mise.toml`, `.oxlintrc.json`, `.fallowrc.json`, `_typos.toml`, `.markdownlint-cli2.jsonc` |
| **Policies** (review rubrics) | What rules should this code follow, and why?       | `.agents/skills/situ-policy-*/SKILL.md`                                                    |
| **Workflow skills**           | How do I do a recurring task?                      | `.agents/skills/situ-<verb>/SKILL.md`                                                      |
| **Context skills**            | How do I learn an area from current source?        | `.agents/skills/situ-context-*/SKILL.md`                                                   |
| **Meta-skills**               | How do I maintain the policies / tools themselves? | `.agents/skills/situ-{add,run,audit,lint,spec}-*/SKILL.md`                                 |
| **Specs**                     | What contract has the product committed to?        | `.agents/specs/NNNN-<name>/SPEC.md`                                                        |
| **Docs** (this)               | Why is the system shaped this way?                 | `.agents/docs/<topic>/DOC.md`                                                              |

The shapes overlap intentionally. A new tool usually gets a policy
(explaining the rule it enforces) and updates one or two existing
policies. A new pattern usually gets a policy first; if the pattern
recurs enough or has a sharp edge, a tool follows.

## The factory metaphor

Each tool is a station; each policy is the QA rubric for that station;
each meta-skill is a checklist for keeping the line running. The
metaphor matters because it implies:

- Stations are **independent** — adding a new tool doesn't require
  rewiring the existing stations.
- Each station has **bounded scope** — `typos` doesn't lint markdown
  structure, `markdownlint-cli2` doesn't spell-check.
- Stations can be **paused** — every tool's "deferred" trigger is
  recorded (`atlas migrate lint`, `commitlint`, `Stryker`, etc.).
- The line is **inspectable** — every layer has an audit / lint / run
  meta-skill so a future agent can verify state without reading every
  config.

## How to add to each layer

### Add a tool

1. Pick the smallest tool that does one job. Avoid meta-runners
   (Trunk, Megalinter) that wrap many tools — they take ownership of
   the JSON shape our policy skills depend on.
2. Install via `mise.toml` `[tools]` (Rust/Go binaries) or
   `package.json` devDeps (npm packages).
3. Add a `[tasks.<name>]` entry in `mise.toml` so the invocation is
   uniform (`mise run <name>`).
4. Decide whether it joins `mise run check` (clean baseline → yes) or
   stays as its own task (existing findings → no, run with
   `--baseline`).
5. Write a policy skill that explains the rule(s) the tool enforces
   and how to interpret its output. Cross-reference any existing
   policies the tool reinforces.

### Add a policy

See `situ-add-policy-skill` for the long form. Short:

- A policy codifies a pattern that recurs **3+ times** (or a tight
  pattern worth locking in even at 0 instances if we want to enforce
  it going forward).
- Frontmatter has a pushy `description: Use whenever ...`.
- Body shape: opening sentence → optional `## Why` → `## Rules` →
  optional `## Exceptions` → `## Avoid` → `## See also`.
- Cross-references use the full skill name, not numbers.
- Run `mise run check` to lint format, then `situ-lint-policies` to
  verify cross-refs resolve.

### Add a workflow skill

See `situ-policy-workflow-skill-shape`. Short:

- Verb-led name (`situ-add-tool`, `situ-review-flow`).
- Procedural body — `## Goal`, `## Procedure`, `## Verification`,
  `## Reporting`.
- Concrete bash commands inline.
- Different shape from policy skills.

### Add a context skill

See `situ-policy-context-skills`. Short:

- Names use the `situ-context-<area>` family prefix.
- The body teaches exploration: what to inspect, how to trace the flow,
  how to verify, and how to report uncertainty.
- Content lives in source, docs, tests, evals, or runtime skills. The
  context skill points there instead of copying it.
- Validate major context changes by spawning a fresh subagent, having it
  run the skill, then asking broad file-backed questions.

### Add a spec

See `situ-policy-spec-shape`. Short:

- Numbered (`.agents/specs/0001-<name>/SPEC.md`).
- Sections: Context → Contract → Review criteria → Out of scope.
- Specs describe end-state; policies describe how to review it.

### Add a doc

See `situ-policy-agents-doc-shape`. Short:

- Topic folder under `.agents/docs/`, file is `DOC.md`.
- Prose, no required schema. This file is a doc.

## The maintenance loop

Once a quarter (or after a heavy refactor), run the loop:

1. **`situ-lint-policies`** — verifies the policy _set_ itself: cross-refs
   resolve, sections present, descriptions pushy, no formatting drift.
2. **`situ-audit-policies`** — sweeps the codebase against every
   policy. Surfaces drift to fix.
3. **`mise run check`** — runs all the mechanical tools. Should be
   green; if not, follow the failing tool's policy to fix or update.
4. **`mise run fallow`** — checks rot indicators that aren't gated
   (dead code, complexity, dupes). Compare against the committed
   baselines under `.fallow/`.
5. **`mise run bench:cli`** — informational. Run if recent work
   touched the CLI or its imports.

When the loop surfaces something, the choice is always the same:

- **Code drifted from policy** → fix the code.
- **Policy is wrong / over-strict** → fix the policy. Document the
  exception inline if it's principled.
- **Tool has a false positive** → fix the tool config (allowlist with
  a one-line reason).

## What we deliberately don't do

Captured in `situ-spec-policy-maintenance#deferred-automation`:

- Supply-chain scanning beyond `bun audit`
- Commit-message linting / Conventional Commits
- Automated dependency updates (Renovate / Dependabot)
- Branch protection / signed commits / PR title rules
- Atlas migrate lint (deferred until versioned migrations exist)
- Mutation testing (Stryker — Bun test API blocker)
- Type-coverage gating (replaced by oxlint type-aware rules)
- Test-coverage gating (lcov is informational; `coverage:summary` guides)

Each item has a documented trigger that would prompt revisiting it.
Adding a new "deferred" item is part of the maintenance loop too —
when we reject a tool, the rejection itself goes in that section.

## The current stack at a glance

```text
tsgo + tsconfig.base.json    →   types
oxfmt                        →   formatting
oxlint (+ TS strict rules)   →   lint
markdownlint-cli2            →   markdown structure
typos                        →   prose / identifier spell check
actionlint                   →   GitHub Actions YAML
fallow                       →   dead code, dupes, complexity, architecture
drizzle-kit check            →   migration consistency (Atlas deferred)
bun audit                    →   dependency CVEs
hyperfine + mitata           →   CLI boot + in-process benches (informational)
bun:test + vitest coverage   →   per-file line coverage (informational, lcov)
lefthook                     →   pre-commit + pre-push gates
```

Each row has a policy skill that explains the rule it enforces and
how to interpret its output. A future agent should be able to
reconstruct the entire stack from `mise tasks` + the
`situ-policy-*` skill set.

## Why this much structure for a small project

Two reasons.

First, the codebase is small **today**. The policies are calibrated
for the codebase being readable in one head — and to stay that way as
it grows. A pattern that recurs 3 times today recurs 30 times in a
year if nothing locks it in.

Second, agents read this layer. When Claude (or any other agent) is
asked to extend Situ, the policies are how it learns what's already
been decided. A loose codebase forces the agent to guess; a tight one
lets it reproduce the existing pattern. Every policy skill is a
guarantee that we've committed to one answer.

## See also

- `situ-spec-policy-maintenance` — the procedural maintenance skill
- `situ-lint-policies` — automated structural check on the policy set
- `situ-audit-policies` — sweep the codebase against all policies
- `situ-add-policy-skill` — how to author a new policy
- `situ-policy-workflow-skill-shape` — how to author a new workflow skill
- `situ-policy-context-skills` — how to author exploration-oriented context skills
- `.agents/docs/testing/DOC.md` — testing principles and per-stack patterns
