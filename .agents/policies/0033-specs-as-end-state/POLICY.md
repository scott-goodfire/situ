---
title: Specs As End State
status: active
---

# Policy: Specs As End State

## Applies To

All files under `.agents/specs/*/SPEC.md`.

## Rule

A spec describes what the system is, not how to build it. It is a contract:
present-tense language, scope, and explicit deferrals, written so that an
agent can compare current code against the spec and derive the deltas
itself.

Implementation plans — numbered steps, migration recipes, "first do X then
do Y" sequencing, test-writing checklists, rollout phases — do not belong in
specs. They duplicate effort, rot the moment work starts, and turn a durable
contract into a stale roadmap. That kind of work belongs in PR descriptions,
the `Plan` agent's output, task content, or runbooks under `.agents/skills/`
or `.agents/docs/`.

Sequencing language inside a spec is acceptable only when it describes a
*runtime* ordering invariant of the running system, for example "Critic
review runs before the Manager replans from a candidate" or "baseline
evidence exists before candidate experiments are filed." A *project
schedule* — what humans or agents will work on first — is not a runtime
invariant.

This policy is a narrowing of [`../0009-good-specs/POLICY.md`](../0009-good-specs/POLICY.md).
0009 says specs should be specific but not over-designed; 0033 says the
specific content must be end state, not procedure.

## Required Checks

- The spec is written in present tense about the running system
  ("`get_project_overview` returns a bounded digest..."), not in process tense
  about the work to do it ("we will refactor `get_project_overview` to...").
- The spec has no numbered implementation steps, migration plans, rollout
  phases, or test-writing checklists.
- The spec has no headings like "Implementation plan", "Sequencing",
  "Migration", "Rollout", "Phasing", or "Next steps".
- Scope and explicit deferrals are stated as scope ("X is in scope, Y is
  intentionally out of scope"), not as schedule ("first slice does X, later
  slice will do Y"). Use "out of scope" or "intentionally deferred" rather
  than "first slice" / "later" when the timing has no end-state meaning.
- Sequencing inside a spec describes a runtime ordering invariant of the
  running system, not a work order for humans or agents.
- Implementation guidance that is genuinely helpful but procedural lives in
  `.agents/skills/<name>/SKILL.md` or `.agents/docs/<name>/DOC.md`, not in
  a spec.
- The spec links to adjacent specs and policies when the contract relies on
  them, instead of restating their content procedurally.

## Red Flags

- Numbered implementation steps in a spec
  ("1. Update protocol models. 2. Refactor the tool. 3. Update tests.").
- A "Sequencing", "Implementation plan", "Migration", or "Rollout" section.
- "First slice / next slice" language used as a timeline rather than as a
  current-scope statement.
- Procedural verbs aimed at the implementer: "we will", "first we", "then
  add", "next we should", "to migrate, ...", "the next step is to ...".
- Spec language that treats the spec itself as the change log rather than
  the contract.
- Spec content that tells an agent *which file to edit* or *what order to
  edit it in* rather than what the resulting behavior should be.
- A spec that would lose meaning the moment its prescribed work is done,
  because it described the work and not the end state.

## Review Questions

- Read each section as if the project were already done. Does it still make
  sense as a description of the current system, or does it read like a
  to-do list?
- Could two implementers reading this spec disagree about what to ship
  *because* the spec told them when to ship it instead of what to ship?
- Is any sequencing in the spec describing a runtime invariant of the
  product, or a project schedule for the team?
- Could a procedural section move out to a PR description, a `Plan` output,
  a task body, or a runbook without losing any contract content?
- Would an agent given the spec and the current codebase be able to
  generate the deltas, or does the spec assume the agent has read a hidden
  plan?
