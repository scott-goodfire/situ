---
title: Primitives
status: active
---

# Policy: Product Primitives

## Applies To

Product copy, domain models, APIs, UI labels, reports, and documentation.

## Rule

Use the product nouns and model meanings defined in
[`../../specs/0003-product-primitives/SPEC.md`](../../specs/0003-product-primitives/SPEC.md).
Do not redefine the domain model in policy text.

## Required Checks

- User-facing surfaces use simple product nouns.
- Domain model changes update the product-primitives spec before code or UI
  copy changes.
- Product copy, APIs, tools, and UI labels use the spec vocabulary rather than
  inventing synonyms.
- Ownership, provenance, status, and relationship behavior follows the
  product-primitives spec.
- Deferred primitives remain deferred unless a spec update explicitly promotes
  them.

## Red Flags

- A shared `ActivityKind` enum used across multiple entity activity records.
  Each entity's activity has its own kind enum.
- User-facing terms like world model, belief graph, trajectory engine, or
  execution substrate.
- Experiments shown as an undifferentiated event stream.
- Relationships inferred from missing fields, magic IDs, titles, or comment
  text when the spec calls for structured relationships.
- Adding deferred primitives before the relevant spec promotes them.
- Multiplying statuses when a short activity would capture the nuance better.
- Calling the first observability summary a health model.
- Making a model the primary workflow object contrary to the
  product-primitives spec.
