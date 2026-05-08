---
title: Tool Docstrings
status: active
---

# Policy: Tool Docstrings

## Applies To

Pydantic AI tool docstrings under
`projects/harness/src/situ/harness/tools/*/tool.py` and toolset instructions
in `projects/harness/src/situ/harness/tools/toolsets.py`.

This policy narrows
[`../0017-agent-tool-surface/POLICY.md`](../0017-agent-tool-surface/POLICY.md):
0017 covers tool architecture (folder layout, naming, where the tool sits
in the surface). This policy covers the prose contract on each tool — what
the docstring says, where voice examples live, and what stays out.

## Rule

A tool docstring is the **how**: what the tool does, what it accepts,
what its preconditions are, and what subtle behavior the model needs to
know to use it correctly. Cross-tool reasoning (when to pick this tool
over another, what tool sequences look like) lives in toolset
instructions, agent role prompts, or runtime skills — not in per-tool
docstrings.

The docstring on a tool is also the description the LLM reads at
tool-selection time. Pydantic AI parses Google-style docstrings into a
short description plus per-arg metadata; structure docstrings so that
parsing keeps working.

The voice contract for prose-bearing fields lives in
[`../../specs/0020-agent-voice/SPEC.md`](../../specs/0020-agent-voice/SPEC.md).

## Required Checks

- The docstring opens with a one-line summary in present tense
  ("Create a hypothesis under the current project."). Multi-paragraph
  prose follows when the tool has voice-bearing fields, gotchas, or
  preconditions worth naming.
- Tools that produce voice-bearing prose (analysis content, hypothesis
  summary, comment bodies, measurement bodies, task content, completion
  summaries) carry **3–5 hand-tuned examples** in their docstring,
  wrapped in `<example field="...">…</example>` tags, on-topic for that
  tool's specific output. Spec 0020 enumerates which tools count.
- Tools with subtle behavior — status preconditions, branching on
  argument combinations, side effects beyond writing the named record,
  conditional argument requirements, inheritance of omitted args from
  the existing record — carry a `Notes:` paragraph that names the
  gotcha. Failure-mode error messages are not a substitute for this;
  the model reads the docstring before it calls the tool.
- Read tools (`get_*`, `list_*`, `search_*`) and trivial mutations
  (`link_*`, simple `create_artifact`-style appends) keep one-line
  docstrings unless they have a real gotcha. Adding prose to obvious
  tools dilutes the signal of long docstrings on tools that need them.
- Docstrings do not enumerate transient enum values inline (status names,
  activity kinds, source kinds) when those values are likely to change.
  Reference the dedicated transition tools or the related spec instead.
  Stale enum enumerations are a recurring drift hazard.
- Docstrings do not include "Use cases" or "When to use this tool"
  sections. Cross-tool reasoning belongs in toolset instructions, agent
  role prompts, or runtime skills under `agent_skills/`.
- Voice examples are calibrated to the register described in spec 0020
  (complete sentences, first-person where natural, cited record IDs
  inline, no telegraphed fragments). They are on-topic for the specific
  tool's output, not generic engineering remarks.
- Status-transition tools that accept an optional `comment` parameter
  inherit voice from the matching `add_*_comment` tool. The transition
  tool's own docstring stays short — it documents the from-state
  precondition and the activity it records.
- Toolset instructions in `tools/toolsets.py` carry the cross-tool
  reasoning: when to pick `search_*` vs `list_*` vs `get_*`, which
  family of transition tools to use, what `comment` vs `recorded` vs
  `status_updated` activity kinds mean. They do not duplicate per-tool
  mechanics — those live on the tool.
- Tests under `tests/test_voice.py` assert that voice-bearing tools
  carry `<example>` blocks. Adding a voice-bearing tool without
  examples breaks the test by design.

## Red Flags

- A long docstring on a plain `get_X` or `list_X` tool when there is no
  gotcha to name.
- A "Use cases" or "When to use this tool" section in a tool docstring.
- An enumerated list of valid status values inline when the lifecycle
  vocabulary may shift; the docstring goes stale before the next refactor.
- Voice examples in docstrings of non-voice-bearing tools (status
  transitions, ID lookups, link creation).
- A `Notes:` paragraph that paraphrases the args section instead of
  naming a real gotcha.
- Docstring args descriptions that duplicate the type signature
  ("`task_id`: the id of the task") rather than naming what the value
  is for.
- Cross-tool reasoning ("if the tool returned no rows, also call
  `search_X`") buried in a per-tool docstring instead of toolset
  instructions.
- Voice examples that read in the model's default register: preamble
  sentences, closing summaries, telegraphed fragments, list-of-bullets
  answers to a non-list question.
- Voice examples copied across multiple comment tools so the analysis,
  hypothesis, and experiment comment tools all show the same generic
  example. Per-tool examples are on-topic for that tool's parent.

## Review Questions

- Does the docstring describe how the tool works, or does it describe
  when to use it? The first belongs here; the second belongs in toolset
  instructions, agent prompts, or skills.
- If the tool has subtle behavior, would a reader notice the gotcha
  from the docstring alone, or only after calling it and reading the
  failure?
- If the tool produces voice-bearing prose, are there 3–5 on-topic
  examples and do they read in the spec 0020 register?
- Are any inline enum enumerations stale relative to the current
  records package?
- Does the docstring stay readable after Pydantic AI parses the
  Google-style sections out of it?
