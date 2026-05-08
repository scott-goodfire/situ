---
title: Specs Describe What Is
status: active
---

# Policy: Specs Describe What Is

## Applies To

All files under `.agents/specs/*/SPEC.md`.

## Rule

Specs describe what the system is. They do not push back against alternatives
nobody else proposed, and they do not point at where the system is heading.

Two patterns to avoid:

### 1. Negation against absent alternatives

Sentences of the form "X replaces Y", "instead of Y", "rather than Y",
"is not a separate Y model", and "do not infer Y" are usually agent-jotted
notes from a past conversation in which Y was on the table. The spec
inherits the defensive framing without inheriting the context. A future
reader sees the spec arguing against an alternative they never proposed
and have no way to evaluate.

When tempted to write a negation, ask: would a reader who never heard the
rejected alternative miss anything? If no, delete the negation and state
the positive contract. If yes, restate what is.

Acceptable exceptions:

- Inside an explicit `## Out of Scope`, `## Deferred`, or `## Non-Goals`
  section, where naming what is intentionally not built is the section's
  whole purpose.
- When the negated thing is a default the reader would otherwise assume
  (e.g., "history is keyed per agent, not per session").
- When the negation is itself the contract (e.g., "Tools must not write to
  the user's repo").

### 2. Directional language

Phrases like "moving toward", "evolving to", "eventually", "for now",
"future direction is", "currently does X but should later do Y", and
"should converge first" describe trajectory, not state. End-state specs
describe what is, even when that includes acknowledging current limits.
If a piece of the system is intentionally narrow, say "scope: X. out of
scope: Y." not "currently X, will eventually Y."

This is a narrowing of [`../0033-specs-as-end-state/POLICY.md`](../0033-specs-as-end-state/POLICY.md):
0033 prohibits implementation plans and timeline framing; 0034 prohibits
two specific lexical patterns that re-introduce the same drift through
side doors.

## Required Checks

- No "instead of", "rather than", or "X replaces Y" outside of explicit
  out-of-scope, deferred, or non-goals sections.
- No "is not a separate X model" or other contrast-with-an-alternative
  sentences outside of those sections.
- No "do not infer", "do not treat X as Y", "do not stuff Y into Z" used
  as standalone scope statements. Restate as the positive contract: "the
  meaning of X is Z."
- No directional phrasing: "moving toward", "evolving to", "eventually",
  "for now", "future direction is", "later this will", "should converge
  first".
- Negations that survive (e.g., contract-shaped "must not") name a
  default the reader would otherwise assume.

## Red Flags

- Sentences of the shape "X. NOT Y." where Y is a random rejected
  alternative the spec never names elsewhere.
- Defensive scoping that reads as a one-sided argument the spec is having
  with no one in the room.
- Hedged future-tense framing about what the system "will become" or
  "should converge to".
- Negation in `## Purpose` or `## Product Rule` sections without an
  explicit reader-facing default that needed to be pushed back against.
- A `## Deferred` section that doubles as a list of contrasts ("X
  replaces Y; we will not build Z") rather than a clean enumeration of
  what is out of scope.

## Review Questions

- For each negation in the spec: would a reader who never heard the
  rejected alternative miss anything? If no, delete it.
- For each "should evolve / will eventually / for now / converge first"
  phrase: rewrite as the current end state plus an explicit out-of-scope
  statement.
- Does any paragraph read as the losing side of an argument the spec
  never introduces?
- Is the spec describing the system, or rebutting alternatives that the
  reader has no view into?
