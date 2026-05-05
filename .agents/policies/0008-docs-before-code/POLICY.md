---
title: Docs Before Code
status: active
---

# Policy: Docs Before Code

## Applies To

Product-significant changes, new surfaces, domain model changes, and runtime
behavior changes.

## Rule

Update the relevant spec before implementing behavior that changes the product
contract.

## Required Checks

- New product concepts are added to `.agents/specs/` before code.
- Changed behavior is reflected in specs and applicable policies.
- Implementation details are kept out of product specs unless needed to define a
  boundary or guarantee.
- Code comments and README content do not become the only source of product
  intent.

## Red Flags

- Implementing a new primitive without defining how users or agents should
  understand it.
- Adding architecture that conflicts with local-first or live-observability
  specs.
- Letting a prototype UI define product behavior accidentally.
- Keeping roadmap-changing decisions only in chat.
