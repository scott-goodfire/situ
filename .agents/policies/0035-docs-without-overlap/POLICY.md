---
title: Docs Without Overlap
status: active
---

# Policy: Docs Without Overlap

## Applies To

All files under `.agents/docs/*/DOC.md`.

## Rule

Docs are for durable explanation that does not belong in a spec or
policy: reference catalogs, external project background, engineering
notes too niche for the contract, narrative onboarding. The contract
itself lives in specs and policies, and docs link to it rather than
restate it.

A doc that paraphrases a spec drifts the moment the spec changes,
doubles maintenance, and leaves future readers averaging two versions of
the same fact. The spec is canonical; the doc earns its keep by adding
content the spec cannot or should not carry.

## Required Checks

- Each doc has one purpose that is not already a spec or policy
  responsibility — for example a reference catalog of external work, a
  failure-mode dictionary, a benchmark target, or an engineering note.
- When a doc touches a contract Situ already owns, it links to the spec
  or policy instead of restating the rule.
- When two docs cover overlapping ground, they are combined, or the
  smaller one becomes a section in the larger one.
- Docs do not carry scope, deferral, or in-scope/out-of-scope lists for
  product behavior — those belong in specs.
- Docs that have drifted into roadmap shape point at specs for the
  durable contract and keep only the unique narrative.

## Red Flags

- A doc that reads like a spec preamble — "the system should X, Y, and
  Z" — without defining its own contract.
- A doc that enumerates in-scope or deferred items already enumerated in
  a spec.
- Two docs with overlapping section titles or near-duplicate paragraphs.
- Doc paragraphs that would silently go stale if the spec changed underneath
  them — a sign the doc is paraphrasing the contract instead of doing
  its own work.
- Roadmap or milestone framing that reads as the canonical statement of
  what Situ does, rather than as context around the specs.

## Review Questions

- If the spec changed tomorrow, which paragraphs in this doc would
  silently go stale?
- Could this doc be replaced by a link to the relevant spec or policy
  plus a sentence or two of unique context?
- Is the content doc-shaped (durable explanation, reference, narrative)
  or contract-shaped (belongs in the spec)?
- Does this doc's title still describe what is actually inside it, after
  the duplicated material is removed?
