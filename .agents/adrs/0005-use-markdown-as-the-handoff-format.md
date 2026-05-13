---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0005. Use Markdown As The Handoff Format

## Context

Agents need rich context: hypotheses, caveats, changed files, evidence,
questions, and instructions. Encoding all of that into rigid schemas would make
handoff brittle and expensive to evolve.

Humans and agents can both read markdown. Markdown is also easy to preserve,
render, quote, and summarize.

## Decision

Situ will use markdown as the default handoff format.

Markdown fields appear in:

- project goals and summaries
- task bodies
- comments
- experiment summaries
- measurement caveats
- review judgments
- artifact bodies
- reports

Structured fields are for indexing, filtering, ownership, status, target links,
timestamps, commits, and sync keys. They do not encode the full meaning of a
handoff.

## Consequences

Agents can use normal reading and writing skills instead of custom payload
parsers.

The app can evolve handoff language without schema churn.

Important query dimensions must still be structured. If a value needs filtering,
sorting, joins, or status transitions, it should not be hidden only in
markdown.

## Related

- ADR 0004: Use Linear-Like Primitives Over Workflows
- Architecture: `.agents/docs/architecture/DOC.md`
