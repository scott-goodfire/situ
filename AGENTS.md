# Agents

This repo is being built product-first. Before implementing code, read the
specs and policies that define what the product should become.

Start with:

- [.agents/specs/README.md](./.agents/specs/README.md)
- [.agents/specs/0001-north-star/SPEC.md](./.agents/specs/0001-north-star/SPEC.md)
- [.agents/specs/0002-mvp-vertical-slice/SPEC.md](./.agents/specs/0002-mvp-vertical-slice/SPEC.md)
- [.agents/policies/DOC.md](./.agents/policies/DOC.md)
- [.agents/docs/agents-surface/DOC.md](./.agents/docs/agents-surface/DOC.md)
- [.agents/docs/milestones/DOC.md](./.agents/docs/milestones/DOC.md)
- [.agents/docs/loose-models-tool-calls/DOC.md](./.agents/docs/loose-models-tool-calls/DOC.md)

The key product thesis:

> Almanac is a local-first terminal observability layer for autoresearch runs.
> It helps humans and agents see what is running, what changed, what evidence
> came back, what looks suspicious, and what the run is learning.

Do not treat this as a generic chat app, coding agent, ML experiment tracker,
or Linear clone. Almanac should supervise runs, track evidence, enforce
automated trust checks, extract lightweight findings, and make the live run
understandable from the terminal.

## Working Rule

For product-significant changes, update the relevant spec before implementing.
For code changes, check the applicable policies in `.agents/policies/`.

Use [.agents/skills/almanac-spec-policy-maintenance/SKILL.md](./.agents/skills/almanac-spec-policy-maintenance/SKILL.md)
when adding, changing, or linting specs and policies.

Use [.agents/skills/curate-meta-layer/SKILL.md](./.agents/skills/curate-meta-layer/SKILL.md)
when the goal is to reduce entropy across specs, policies, docs, skills, recent
conversation context, and recent commits/diffs.

Routine command surface should eventually live in `mise.toml`, with reusable
scripts in `commands/`, following the pattern from the reference Almanac
prototype.
