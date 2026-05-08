---
title: Model Formality
status: active
---

# Policy: Model Formality

## Applies To

Durable records, protocol schemas, repository changes, agent tool models,
activity payloads, prompts, eval assertions, and product terminology decisions.

## Rule

Use structured models where the system must enforce, link, query, render, or
compare state. Use freeform text where the meaning is semantic, project-specific,
or better interpreted by an LLM or human.

Situ should prefer typed envelopes around flexible content. A record can have a
formal identity, owner, status, relationship, provenance, and timestamp while
leaving its rationale, interpretation, research context, or comment body as
plain text.

## Required Checks

- Formalize fields when code depends on them for identity, ownership,
  permissions, lifecycle, ordering, filtering, subscriptions, task claiming,
  trust checks, comparability, or cross-record links.
- Keep concrete domain model names, meanings, ownership rules, and relationship
  shapes in specs. Policies should point to those specs and define review
  checks rather than restating the product model.
- Keep project objective, research context, activity bodies, planning notes,
  interpretation text, and ambiguous rationale as strings unless a concrete
  product behavior needs stable fields.
- Prefer Pydantic models or generated protocol schemas for tool inputs,
  tool results, durable records, and external message/history formats when those
  formats already define a contract.
- Use payload metadata for lightly structured receipts such as command output
  summaries, metric bundles, workspace-state observations, raw tool results, and
  artifact references while the shape is still evolving.
- Promote a payload key to a typed field or record only when multiple runtime
  paths need to enforce or query it, such as UI grouping, task dependencies,
  experiment comparability checks, or eval assertions.
- Do not make agents rely on parsing freeform text for critical invariants.
  Represent those invariants using the structured relationship shapes defined
  by the relevant specs.
- Keep comments and result bodies human-readable even when payload metadata is
  present. Structured data should support review, not replace the explanation.
- When a new first-class model is proposed, identify the software behavior it
  enables that cannot be handled by an existing typed envelope plus text or
  payload metadata.

## Red Flags

- A critical relationship is represented only by words in a comment, title, or
  prompt.
- A status enum grows to capture qualitative judgments that would be clearer as
  an activity body plus optional payload metadata.
- A new table exists only to make LLM-written semantics look tidy, without
  enforcement, querying, rendering, or trust-check value.
- Tool arguments use broad `dict[str, Any]` shapes when a small Pydantic model
  would prevent invalid calls.
- The UI, evals, or trust checks search for magic substrings instead of using a
  typed role, relationship, or link defined by the relevant specs.
- Raw metrics become many rigid columns before the product knows which metrics
  are stable across projects.

## Review Questions

- Will code need to filter, join, compare, gate, or validate this concept?
- Is the concept stable across different research projects, or is it
  project-specific language best left to text?
- Would a human reviewer lose important nuance if this became a rigid field?
- Would the system become less trustworthy if this stayed freeform?
- Can an existing record plus payload metadata carry this until the shape proves
  stable?
