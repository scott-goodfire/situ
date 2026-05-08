---
name: add-tool
description: Use when adding a new agent-facing tool to the Situ harness. Covers ownership folder layout, BaseSituTool subclassing, docstring shape (per policy 0036), voice examples for voice-bearing tools (per spec 0020), toolset registration, and tests.
---

# Add Tool

Use this skill when adding a new tool to Situ's agent surface
(`projects/harness/src/situ/harness/tools/`). It walks through the
architecture choices, docstring contract, and tests that an agent should
make explicit instead of inferring from neighboring tools.

The two contracts this skill enforces:

- [`../../policies/0017-agent-tool-surface/POLICY.md`](../../policies/0017-agent-tool-surface/POLICY.md)
  for tool architecture (folder, naming, BaseSituTool subclass, repository
  use).
- [`../../policies/0036-tool-docstrings/POLICY.md`](../../policies/0036-tool-docstrings/POLICY.md)
  for the prose contract on each tool — what the docstring says, when
  voice examples are required, what stays out.

The voice register for prose examples is fixed by
[`../../specs/0020-agent-voice/SPEC.md`](../../specs/0020-agent-voice/SPEC.md).

## Decide The Tool Shape

Before writing code, answer these:

1. **Read or mutate?** Read tools (`get_*`, `list_*`, `search_*`) do not
   set `sequential = True`. Mutation tools should.
2. **Voice-bearing or not?** If the tool accepts a free-prose body field
   that humans will read (analysis content, hypothesis summary, comment
   body, measurement body, task content, completion summary), it is
   voice-bearing. Status-transition tools that accept an optional
   `comment` are not — the comment inherits voice from the matching
   `add_*_comment` tool.
3. **Which entity does it belong to?** The tool lives under
   `tools/<entity>/<tool_name>/`. If it is a cross-entity tool (like
   `search_everything`) it lives under `tools/<group>/<tool_name>/`.
4. **Which agent toolsets need it?** Researcher, Scientist, Manager,
   Critic, or some subset. This decides which `build_*_toolset()`
   functions in `tools/toolsets.py` register it.

## Create The Folder

Per policy 0017, every tool lives in its own ownership folder with three
files:

```text
tools/<entity>/<tool_name>/
├── __init__.py    # re-exports the tool class and its result type
├── models.py      # the result Pydantic model (subclass of SituToolReturn)
└── tool.py        # the tool class (subclass of BaseSituTool)
```

Copy-paste an existing neighbor (e.g. `tools/analyses/list_analyses/`) as
a starting point and rename. Keep arguments keyword-only and typed.

## Write The Tool Class

```python
class CreateThingTool(BaseSituTool[SituToolDeps, CreateThingResult]):
    name = "create_thing"
    result_type = CreateThingResult
    sequential = True  # for mutations

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        # other typed args
        **_kwargs: Any,
    ) -> CreateThingResult:
        """<docstring per policy 0036, see below>"""
        ...
```

Call repositories or API services from `execute`, not direct SQL. Emit
events via `ctx.deps.record_event(...)` and publish records via
`ctx.deps.publish_record(...)` so the collection layer stays consistent.

## Write The Docstring

Per policy 0036:

- **Open with a one-line present-tense summary.** "Create a thing under
  the current project."
- **Add a `Notes:` paragraph if the tool has subtle behavior** —
  preconditions, branching on argument combinations, side effects
  beyond writing the named record, inheritance of omitted args from the
  existing record. The model reads the docstring before it calls the
  tool; failure-mode error messages are not a substitute.
- **Skip enum enumerations.** Pointing at the dedicated transition tools
  ages better than enumerating valid status values inline.
- **Skip "Use cases" / "When to use" sections.** Cross-tool reasoning
  belongs in toolset instructions, agent role prompts, or runtime
  skills, not on the tool.

If the tool is voice-bearing, also:

- **Add 3–5 `<example field="...">…</example>` blocks** in the docstring,
  on-topic for that specific tool's output. The voice register is fixed
  by spec 0020 — complete sentences with explicit subjects, first-person
  where natural, cited record IDs inline.
- Read other voice-bearing tools' docstrings (e.g.
  `add_analysis_comment`, `add_measurement`, `complete_task`) and match
  the register. Do not copy generic examples across comment tools — each
  tool's examples should be on-topic for its parent record kind.

If the tool is non-voice-bearing, the one-line summary and an optional
`Notes:` paragraph are usually all it needs.

## Register In Toolsets

Add the tool to the relevant `build_*_toolset()` functions in
`tools/toolsets.py`. Most tools belong to one or more of:

- `build_scientist_toolset()` (read+write research records)
- `build_researcher_toolset()` (analyses + hypotheses, no candidate work)
- `build_manager_toolset()` (project + task coordination, no records)
- `build_critic_toolset()` (review + status transitions)

If the new tool changes how an existing tool family is used (e.g. a new
discovery primitive), update the relevant toolset instructions in the
same file. Toolset instructions own cross-tool reasoning per policy 0036.

## Test

- Add or extend a test in `projects/harness/tests/test_tools.py`. Use
  the existing `invoke_situ_tool` helper and the `repos` fixture.
- If the tool is voice-bearing, the existing
  `test_voice.py::test_voice_bearing_tools_have_at_least_three_examples`
  invariant catches a missing or under-populated `<example>` block when
  you add the tool to its assertion list. Update that list.
- If the tool has gotcha behavior, write a test that exercises the
  gotcha (e.g., the precondition rejection path).

Run the test suite:

```bash
uv run --project projects/harness pytest projects/harness/tests/test_tools.py
uv run --project projects/harness pytest projects/harness/tests/test_voice.py
```

The `test_backend_invariants.py::test_situ_tool_folders_match_toolset_registration`
check will fail if a tool exists on disk but is not registered in any
toolset. That's a deliberate guard.

## Update Specs/Docs If The Surface Shifts

A new tool that introduces a new product action — not a variant of an
existing one — may also shape the spec. Read
[`../../specs/0008-agent-facing-context/SPEC.md`](../../specs/0008-agent-facing-context/SPEC.md)
and update it if the agent-facing surface contract changes. For routine
tool additions (a search variant, a comment writer for a new entity)
the spec usually does not move.

If the tool is voice-bearing and the per-tool example list in spec
0020-agent-voice is enumerated by name, add the new tool there too.
