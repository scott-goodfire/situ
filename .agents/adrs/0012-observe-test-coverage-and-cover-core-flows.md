---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0012. Observe Test Coverage And Cover Core Flows

## Context

Situ will be implemented by humans and agents across many small packages. Test
coverage needs to be visible enough that an agent can tell what is protected,
but the project should not chase 100 percent line coverage as a substitute for
covering important behavior.

The app's highest-risk areas are core product flows: projects, tasks,
assignment, notifications, comments, events, sync, scheduler wakeups, agent
sessions, experiment revision, review, and report generation.

## Decision

Situ will make coverage observable across the full repo and across each package.

Coverage commands are part of the normal command surface:

- root `mise run coverage`
- project-local `mise run coverage`
- package-local `mise run coverage`
- root namespaced package coverage commands such as
  `mise run app:tasks:coverage`

Coverage output should be detailed and inspectable. Prefer text summaries for
quick local feedback and LCOV files under `.coverage/` for deeper inspection and
CI artifacts.

Coverage is not initially a hard percentage gate. The hard rule is that core
flows must have explicit scenario tests at the right boundary. Once the baseline
is stable, the team can add thresholds as a separate decision.

## Consequences

Every package that owns product behavior should have deterministic tests and a
coverage command. Utility packages may have smaller coverage surfaces, but their
public helpers should still be tested.

Core flow tests should read like product behavior, not implementation trivia.
For example, a task handoff test should create a project, create or assign a
task, create a notification, mark inbox state, write comments, update status,
and assert the durable records.

Coverage reports are diagnostic evidence. A low-coverage file is not
automatically wrong, but untested core behavior is a bug in the test plan.

Generated files, build output, and external dependencies do not count toward
coverage.

## Related

- ADR 0007: Use Mise As The Repo Command Surface
- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
- ADR 0040: Test Packages At Their Boundaries
