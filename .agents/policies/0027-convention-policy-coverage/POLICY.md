---
title: Convention Policy Coverage
status: active
---

# Policy: Convention Policy Coverage

## Applies To

Backend architecture reviews, repeated directory patterns, recurring naming or
ownership conventions, `.agents/policies/**`, and code changes that establish a
new repeated project convention.

## Rule

When the backend has a repeated convention with three or more concrete examples,
it should have a policy or be explicitly covered by an existing policy. Policies
are how Situ keeps repeated patterns reviewable for future agents.

Do not add policies for every one-off implementation detail. Add policies for
conventions that future contributors are likely to copy, extend, or get wrong.

## Required Checks

- During backend refactors and new subsystem work, scan for patterns with at
  least three examples in the same family, such as records, repositories, API
  services, eval worlds, runtime skills, tools, agents, command handlers, or
  workspace managers.
- If a repeated pattern lacks policy coverage, either add a focused policy with
  the next numbered directory or update the closest existing policy.
- A new policy must prevent a recurring mistake or make review more concrete.
  It should not be generic architecture prose.
- Policies should name the files or directories they apply to, define the rule,
  list required checks, and list red flags.
- Prefer one policy per convention family when the family has distinct review
  concerns. Do not bury unrelated checks in a broad catch-all policy.
- Cross-link adjacent policies or specs when the relationship matters, but do
  not duplicate entire specs inside policies.
- Update `.agents/policies/DOC.md` whenever a policy is added, removed, renamed,
  or made inactive.
- Use `.agents/skills/situ-spec-policy-maintenance/SKILL.md` for policy
  numbering, index updates, and LLM lint.
- If a repeated convention is intentionally not policy-worthy, leave a short
  reviewer note in the change explaining why the existing policies are enough.

## Red Flags

- A new backend pattern appears in several places, but future agents have no
  policy that says how to extend it.
- A review repeatedly gives the same feedback, but the feedback is not captured
  in a policy.
- A policy is added as a design essay without concrete checks.
- One policy becomes a dumping ground for unrelated conventions.
- New policies are not linked from `.agents/policies/DOC.md`.
- The codebase relies on tribal memory for folder structure, naming, ownership,
  or test/eval expectations.

## Review Questions

- Would a future agent know how to add the fourth example of this pattern?
- Is this convention already covered by a policy with concrete required checks?
- Has this pattern caused confusion or repeated cleanup work?
- Is the proposed policy narrow enough to be useful during code review?
