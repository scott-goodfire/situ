---
status: accepted
implementation_status: not_applicable
created: 2026-05-12
---

# 0000. Use Simple Agent-First Decision Heuristics

## Context

Situ is an experimental project, but it should not become hard to understand.
Future humans and agents will make many implementation decisions that are not
spelled out in an ADR.

The project needs a shared decision rubric: what to prefer when two designs are
both plausible.

## Decision

Situ will use simple, agent-first decision heuristics.

Prefer designs that are:

- simple: few concepts, few paths, few special cases
- clear: records and transitions can be explained in ordinary language
- low cognitive load: one package or primitive can be understood in isolation
- agent-first: an agent can infer the next action by reading visible state
- human-readable: meaningful handoff is markdown or summary text
- structured where it matters: status, ownership, links, commits, timestamps,
  and query dimensions are real fields
- primitive-focused: new concepts exist only when they have a distinct
  lifecycle, owner, query surface, or recovery value
- recoverable: another agent can resume work from durable records
- evidence-oriented: claims point to measurements, reviews, artifacts, comments,
  or events
- locally testable: important behavior can be tested at package or app-action
  boundaries

When these heuristics conflict, prefer recoverability and clarity over local
cleverness. Simplicity does not mean hiding real state in markdown. It means
using the smallest set of obvious records that still lets agents and humans
understand what happened.

## Consequences

Later ADRs should read as applications of this rubric.

When adding a new primitive, package, app action, scheduler rule, or runtime
state record, the implementation should be able to answer:

- what visible problem does this solve
- who or what owns it
- how an agent reads it
- how an agent changes it
- how another agent recovers from it
- why an existing primitive is not enough

If the answer is mostly "because the code is easier to orchestrate that way",
the design is probably drifting toward hidden workflow machinery.

This ADR is intentionally broad. It should guide ambiguous choices without
replacing more specific ADRs.

## Alternatives Considered

A workflow-first rubric would optimize for explicit control flow, leases,
queues, and hidden coordination state. That would make the system easier to
script but harder for agents to recover from by reading product state.

A pure markdown/log rubric would minimize schema, but it would make filtering,
ownership, review, sync, and recovery too vague.

## Related

- ADR 0001: Build A Local Autoresearch App
- ADR 0002: Optimize For Global Maxima Search
- ADR 0004: Use Linear-Like Primitives Over Workflows
