---
name: verify-specs-against-project
description: >-
  Use when the user asks to check whether the specs and the actual code/state
  are still in sync, find spec ↔ project drift, and propose targeted updates to
  one side or the other. Different from curate-meta-layer (which is broad
  meta-layer entropy reduction): this skill is narrow and grounded in evidence
  from the running codebase.
---

# Verify Specs Against Project

## Overview

Use this skill to audit whether each spec under `.agents/specs/*/SPEC.md`
still matches the actual codebase, runtime behavior, and product surface.
The goal is to surface drift between spec end-state claims and current
reality, and to propose deltas to either the spec or the code — never to
silently rewrite either.

Specs are end-state contracts (see
[`../../policies/0033-specs-as-end-state/POLICY.md`](../../policies/0033-specs-as-end-state/POLICY.md)).
This skill is how an agent stress-tests that contract against the running
project.

Default to proposing changes first. Apply changes only when the user asks.

## When To Use

- User asks "do the specs match the code?", "is anything stale?", or "what
  should we clean up in the specs?"
- After a large feature ships and the spec authors want to confirm the spec
  still describes the new reality.
- Before adopting a new policy that depends on spec accuracy.
- Periodic hygiene — pair with `curate-meta-layer` when full meta sweep is
  wanted.

## Process

### 1. Frame the audit

- List every spec: `ls .agents/specs/*/SPEC.md`.
- Pull the spec index: `.agents/specs/README.md`.
- Identify the code surfaces each spec governs (Python harness, TUI, web,
  protocol, CLI, agent prompts, agent skills, repositories). For most specs
  the spec body or its links already say which area it covers.

### 2. Per-spec evidence pass

For each spec, run this loop:

- Read the spec end-to-end.
- Extract its end-state claims as a short bullet list: behaviors, names,
  shapes, contracts, scope statements (in/out), and explicit non-goals.
- For each claim, find the smallest piece of code that should exemplify it
  (a tool, a CLI subcommand, a model, a config default, a prompt section, a
  skill file, a route).
- Confirm or refute the claim from the code, not from memory. Use grep,
  Read, and `Explore` subagents for breadth. Do not infer.

Heavier specs benefit from delegating evidence-gathering to an `Explore`
subagent with the claim list as input — one subagent per spec, in parallel
when possible. Brief the subagent with: claims to verify, search hints, and
"return concise per-claim findings; do not propose edits."

### 3. Classify each finding

Bucket each claim into one of:

- **Aligned** — spec claim matches code reality. No action.
- **Spec ahead of code** — spec describes behavior not yet built. Either
  reframe the spec passage as scope/deferral, or file work, or remove the
  passage if the intent has shifted. Note that a spec may legitimately
  describe an as-yet-unbuilt end state if it's part of the project's
  current contract; the question is whether that intent still holds.
- **Code ahead of spec** — code does something material the spec doesn't
  describe. Update the spec to reflect the contract that now exists.
- **Contradiction** — spec and code disagree on a load-bearing detail.
  Decide which is canonical. Flag the conflict; do not silently pick a
  side.
- **Stale reference** — names, file paths, env vars, or tool names in the
  spec no longer exist or have been renamed. Update the spec.
- **Superseded scope** — deferred/out-of-scope items that have since been
  built. Move them out of the deferral list and describe the resulting
  end state.
- **Procedural drift** — spec language has slipped back into "first
  slice / we will / next step" framing. Reframe per
  [`../../policies/0033-specs-as-end-state/POLICY.md`](../../policies/0033-specs-as-end-state/POLICY.md).

### 4. Propose deltas

For each finding that needs action, write a single-line proposal naming:

- Which spec section (file + heading or line range)
- Which bucket from above
- The exact change in plain language

Group proposals per spec so the user can approve or reject by file. Do
not interleave many specs in one block; keep diffs scoped.

### 5. Apply or stop

Wait for the user to approve a batch. Then edit only the spec passages
named in approved proposals. Do not edit code from this skill — code
changes that the audit reveals belong to a separate task with its own
plan and review.

## Output Shape

Final report should be compact and skimmable. Per-spec block:

```text
SPEC 0008 agent-facing-context
- Aligned: get_project_board returns a typed digest (tool exists, returns
  GetProjectBoardResult).
- Stale reference: section "Candidate CLI/API Surface" lists `situ status`,
  `situ wait` — wait subcommand exists, status references TUI screen that
  was removed; reframe as "headless siblings include status, snapshot,
  events, sessions, wait, clear" matching cli/commands/main.py.
- Code ahead of spec: tool surface includes `add_evaluation_result`,
  `inspect_workspace_state`, `link_task_entity` not mentioned by name.
  Recommend a one-line addition to the workspace/measurement section.
- Spec ahead of code: cursor / "since" anchor in `get_project_board` not
  yet implemented. Keep as scope; add an explicit note that the cursor is
  emitted but unused by current agents.
```

End with an aggregate count: how many findings per bucket.

## Anti-Patterns

- Do not rewrite a spec because a few sentences are stale; propose surgical
  edits.
- Do not propose code changes from this skill. Drift in code is a separate
  workstream; this skill produces a finding, not a refactor.
- Do not trust prior conversation summaries about what the code does. Read
  the code.
- Do not lump unrelated specs together. Each spec gets its own evidence
  pass and its own proposal block.
- Do not run this audit silently — surface the per-claim findings even
  when most are aligned, so the user can confirm coverage.

## Related

- [`../../policies/0009-good-specs/POLICY.md`](../../policies/0009-good-specs/POLICY.md)
- [`../../policies/0033-specs-as-end-state/POLICY.md`](../../policies/0033-specs-as-end-state/POLICY.md)
- [`../situ-spec-policy-maintenance/SKILL.md`](../situ-spec-policy-maintenance/SKILL.md)
- [`../curate-meta-layer/SKILL.md`](../curate-meta-layer/SKILL.md)
