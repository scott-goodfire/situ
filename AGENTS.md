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

> Almanac is a local-first terminal observability layer for autoresearch
> sessions. It helps humans and agents see the objective, active hypotheses,
> experiments, typed activities, artifacts, and internal events while the loop
> runs.

Do not treat this as a generic chat app, coding agent, ML experiment tracker,
or Linear clone. Almanac should supervise sessions, track hypotheses and
experiments, record typed activities, preserve artifacts, enforce automated
trust checks as concern activities, and make the live session understandable
from the terminal.

## Working Rule

For product-significant changes, update the relevant spec before implementing.
For code changes, check the applicable policies in `.agents/policies/`.

Use [.agents/skills/almanac-spec-policy-maintenance/SKILL.md](./.agents/skills/almanac-spec-policy-maintenance/SKILL.md)
when adding, changing, or linting specs and policies.

Use [.agents/skills/curate-meta-layer/SKILL.md](./.agents/skills/curate-meta-layer/SKILL.md)
when the goal is to reduce entropy across specs, policies, docs, skills, recent
conversation context, and recent commits/diffs.

Use [.agents/skills/playwright-storybook-screenshots/SKILL.md](./.agents/skills/playwright-storybook-screenshots/SKILL.md)
when inspecting web UI with Playwright, capturing Storybook screenshots, or
using the Playwright MCP server for browser-driven review.

Use [.agents/skills/run-and-verify-evals/SKILL.md](./.agents/skills/run-and-verify-evals/SKILL.md)
when running Almanac eval suites and verifying their local and Logfire results.

Use [.agents/skills/use-logfire/SKILL.md](./.agents/skills/use-logfire/SKILL.md)
when checking Logfire CLI auth, telling the user how to log in, selecting
projects, creating read tokens, querying traces, or verifying telemetry.

Routine command surface should eventually live in `mise.toml`, with reusable
scripts in `commands/`, following the pattern from the reference Almanac
prototype.
