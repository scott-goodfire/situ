# Agents

This repo is being built product-first. Before implementing code, read the
specs and policies that define what the product should become.

Start with:

- [.agents/specs/README.md](./.agents/specs/README.md)
- [.agents/specs/0001-north-star/SPEC.md](./.agents/specs/0001-north-star/SPEC.md)
- [.agents/specs/0002-active-vertical-slice/SPEC.md](./.agents/specs/0002-active-vertical-slice/SPEC.md)
- [.agents/policies/DOC.md](./.agents/policies/DOC.md)
- [.agents/docs/agents-surface/DOC.md](./.agents/docs/agents-surface/DOC.md)
- [.agents/docs/milestones/DOC.md](./.agents/docs/milestones/DOC.md)
- [.agents/docs/loose-models-tool-calls/DOC.md](./.agents/docs/loose-models-tool-calls/DOC.md)
- [.agents/docs/evals-strategy/DOC.md](./.agents/docs/evals-strategy/DOC.md)

The key product thesis:

> Situ is a local-first terminal observability layer for autoresearch
> sessions. It helps humans and agents see the objective, active hypotheses,
> experiments, typed activities, artifacts, and internal events while the loop
> runs.

Do not treat this as a generic chat app, coding agent, ML experiment tracker,
or Linear clone. Situ should supervise sessions, track hypotheses and
experiments, record typed activities, preserve artifacts, enforce automated
trust checks as concern activities, and make the live session understandable
from the terminal.

## Working Rule

For product-significant changes, update the relevant spec before implementing.
For code changes, check the applicable policies in `.agents/policies/`.

Use [.agents/skills/situ-spec-policy-maintenance/SKILL.md](./.agents/skills/situ-spec-policy-maintenance/SKILL.md)
when adding, changing, or linting specs and policies.

Use [.agents/skills/curate-meta-layer/SKILL.md](./.agents/skills/curate-meta-layer/SKILL.md)
when the goal is to reduce entropy across specs, policies, docs, skills, recent
conversation context, and recent commits/diffs.

Use [.agents/skills/playwright-storybook-screenshots/SKILL.md](./.agents/skills/playwright-storybook-screenshots/SKILL.md)
when inspecting web UI with Playwright, capturing Storybook screenshots, or
using the Playwright MCP server for browser-driven review.

Use [.agents/skills/run-and-verify-evals/SKILL.md](./.agents/skills/run-and-verify-evals/SKILL.md)
when running Situ eval suites and verifying their local and Logfire results.

Use [.agents/skills/use-logfire/SKILL.md](./.agents/skills/use-logfire/SKILL.md)
when checking Logfire CLI auth, telling the user how to log in, selecting
projects, creating read tokens, querying traces, or verifying telemetry.

Use [.agents/skills/query-logfire/SKILL.md](./.agents/skills/query-logfire/SKILL.md)
when read-token access is available and the task is to query Situ harness or
eval trace records.

Use [.agents/skills/review-situ-run/SKILL.md](./.agents/skills/review-situ-run/SKILL.md)
when reviewing a completed or active Situ run from a workspace path, session
id, local SQLite state, code diff, and Logfire traces.

Routine command surface should eventually live in `mise.toml`, with reusable
scripts in `commands/`, following the pattern from the reference Situ
prototype.

## Python Package Layout

The Python code uses a deliberately nested layout:

```text
projects/harness/src/situ/harness/
shared/python/protocol/src/situ/protocol/
```

`situ` is a [PEP 420 namespace package](https://peps.python.org/pep-0420/),
not a regular package. It is shared across multiple installable distributions
so that imports read as siblings under one top-level name:

```python
from situ.harness.tools import ...   # from situ-harness
from situ.protocol      import ...   # from situ-protocol
```

The inner `harness/` (and `protocol/`) directories are what make each
distribution importable; the `[tool.setuptools.packages.find]` block in
`projects/harness/pyproject.toml` sets `namespaces = true` to enable this.

**Do not flatten `src/situ/harness/` to `src/situ/`.** Two workspace
packages cannot both claim `src/situ/` as a regular package — Python would
see conflicting definitions at install time. The nesting is the price of
cross-package namespace sharing, and it is intentional. Future `situ.*`
packages (e.g. `situ.cli`, `situ.worker`) can slot in the same way.
