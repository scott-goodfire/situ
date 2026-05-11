---
name: situ-context-codebase-priorities
description: Use when making Situ tradeoff decisions around refactors, cleanup findings, abstraction boundaries, Fallow suppressions, or convention choices.
---

# Situ Context Codebase Priorities

## Goal

Make codebase tradeoffs from current source, not generic taste. Read the
nearby code, policies, tests, and recent changes, then choose the option
that keeps the repo easiest to understand and safest to change.

## What To Look For

Before choosing a direction, locate:

- the nearest existing pattern for the same kind of code
- the policy skill that governs the surface, if one exists
- the tests, stories, evals, or checks that prove the behavior
- the callers that would carry any new abstraction
- the current tool finding, warning, or cleanup pressure
- any uncommitted edits that change the local convention

## Priority Stack

Reliability is a gate: do not choose an option that makes behavior less
correct, less observable, or less testable. Among reliable options, rank
tradeoffs this way:

1. **Codebase clarity** — prefer the shape with the lowest cognitive
   load: obvious names, readable call sites, local reasoning, and easy
   grep trails.
2. **Existing convention** — match the nearest established pattern
   before inventing a new one. If conventions conflict, prefer the one
   closest to the changed surface.
3. **Simplicity** — keep the fewest moving parts that solve the real
   problem. Add abstractions only when they make repeated code easier
   to read, test, or evolve.
4. **Reliability margin** — when options are otherwise close, prefer the
   one that is harder to misuse, easier to test, and clearer to debug.
5. **Performance** — optimize hot paths and measured bottlenecks, but do
   not contort ordinary code for hypothetical speed.

## Applying The Stack

Use the stack to decide whether to refactor, keep code inline, or update
tool configuration:

- If an abstraction makes call sites clearer and behavior easier to
  protect, extract it.
- If an abstraction hides simple declarative code or forces readers to
  chase indirection, keep the code inline and document the tool exception.
- If a tool finding is a real bug, stale export, unused dependency, or
  confusing public surface, fix the code instead of suppressing it.
- If local convention points one way and a broad preference points
  another, follow the local convention and note the tension.

## Reporting

Return a file-backed recommendation:

- files and policies inspected
- options considered
- which priority decided the tradeoff
- checks to run or checks already run
- remaining uncertainty or follow-up cleanup
