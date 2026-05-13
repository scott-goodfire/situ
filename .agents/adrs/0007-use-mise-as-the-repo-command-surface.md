---
status: accepted
implementation_status: partially_implemented
created: 2026-05-12
---

# 0007. Use Mise As The Repo Command Surface

## Context

Humans and agents need one obvious way to run the project. If commands are
split across package scripts, ad hoc shell snippets, GitHub workflow YAML, and
tool-specific docs, future agents will guess and drift.

The classic app used `mise.toml` successfully as the top-level command surface.
That pattern fits Situ's low-cognitive-load goal.

## Decision

`mise.toml` is the canonical command surface at every workspace level.

The root `mise.toml` is the most important command index. It owns:

- tool versions for command-line tools such as Bun, typos, actionlint, and
  ripgrep
- top-level tasks such as `update`, `check`, `test`, `lint`, `format`,
  `format:check`, `typos`, `markdownlint`, `actionlint`, `audit`, and release
  tasks
- app-facing commands such as `app`, `exec`, `status`, `events`, and report
  generation when those commands exist
- database commands such as migration generation and migration application
- namespaced delegation tasks for projects and packages

Root `package.json` scripts are compatibility wrappers around `mise run <task>`.
Project and package `package.json` scripts may also wrap local `mise` tasks for
Bun workspace compatibility, but common workflows must be exposed through
`mise`.

The command surface owns the compiler choice. Typechecking tasks use the
TypeScript 7 native preview command, `tsgo`, through `mise` and package scripts.
Do not introduce parallel `tsc` check paths that make local development, CI, and
subagent verification disagree.

Agents should prefer `mise run <task>` over direct tool invocations unless they
are debugging a specific task implementation.

Projects and packages should also have local `mise.toml` files when they have
commands worth running in isolation.

```text
mise run check                 # root check
mise run app:check             # root delegates to projects/app
mise run app:tasks:test        # root delegates to projects/app/packages/tasks

cd projects/app
mise run check                 # project-local check

cd projects/app/packages/tasks
mise run test                  # package-local test
```

Namespacing rules:

- project tasks use `<project>:<task>` from the root
- app package tasks use `app:<package>:<task>` from the root
- local project/package tasks keep short names such as `check`, `test`,
  `lint`, `format:check`, `build`, `dev`, or `spec:check`
- root tasks may aggregate many namespaced tasks, but nested tasks should stay
  focused on their own project or package

## Consequences

Local development, agent verification, and GitHub Actions can call the same
tasks.

New recurring commands should be added to `mise.toml` before they are mentioned
in docs, skills, CI, or release scripts.

Task names should be stable and ordinary. Prefer `check`, `test`, `lint`,
`format:check`, `db:migrate`, and `release:build` over project-specific
phrasing that requires explanation.

A subagent implementing one package should be able to work from that package
directory, run `mise run test`, and then return to the root and run the
corresponding namespaced task plus any broader root checks.

## Related

- ADR 0006: Use Bun, Hono, SQLite, Drizzle, And Replicache
- ADR 0008: Keep Repository Scripts Thin And Boring
- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
