---
status: accepted
implementation_status: not_applicable
created: 2026-05-12
---

# 0012. Keep Agent Skills And Policies Slim

## Context

Classic Situ had a rich `.agents/skills` layer: context skills, workflow
skills, policy skills, audit skills, and meta-maintenance skills. That helped
agents find current patterns, but it also created a lot of surface area to
curate.

This project wants lower cognitive load. ADRs, package READMEs/SPECs, tests,
and source should carry the durable rules. Agent skills should help agents find
and apply those rules, not duplicate them.

## Decision

Situ will curate a slim agent meta layer.

Allowed skill categories:

- context skills that teach agents how to inspect an area from current source
- workflow skills for recurring procedures such as adding a package, running a
  release smoke test, or curating the meta layer
- policy skills only for small review rubrics that are easier to trigger as a
  skill than to rediscover from broad docs
- meta skills and scripts that lint skill shape, cross-references, and command
  references

Policy skills should be short. They should usually say things like "for this
kind of change, read ADR 0016 and ADR 0021, then verify these package
contracts." They should not restate large architecture decisions.

Add a skill only when it reduces repeated agent confusion, protects a sharp
edge, or captures a workflow that has happened enough times to deserve a
checklist.

## Consequences

ADRs remain the source of truth for durable decisions.

Package README/SPEC files remain the source of truth for package-local
contracts.

Skills are navigation, curation, and review aids. If a skill conflicts with an
ADR, update or remove the skill.

The meta-layer maintenance loop should look for stale guidance, duplicate
policy text, broken cross-references, missing `mise run` tasks, and skills that
should be replaced by ADR or package-spec links.

## Related

- ADR 0000: Use Simple Agent-First Decision Heuristics
- ADR 0007: Use Mise As The Repo Command Surface
- ADR 0011: Use Mechanical Quality Gates For Code And Meta Docs
- ADR 0017: Define Common Package Contract
