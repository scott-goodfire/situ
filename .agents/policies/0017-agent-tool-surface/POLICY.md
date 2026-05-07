---
title: Agent Tool Surface
status: active
---

# Policy: Agent Tool Surface

## Applies To

Pydantic AI tools, toolsets, agent deps, agent-facing APIs, and code that lets
agents read or mutate Situ research state.

## Rule

Situ ledger tools should feel like explicit operations over Situ product
models and familiar research actions. Prefer concrete, inspectable tools such
as `get_project_board`, `get_project`, `create_hypothesis`, `update_experiment`,
`add_experiment_comment`, and `add_evaluation_result` over abstract tools that
ask the model to choose internal ontology details.

Workspace tools are separate. It is acceptable to use a maintained Pydantic AI
console/filesystem toolset for ordinary coding-agent operations such as
`read_file`, `grep`, `glob`, `edit_file`, and `execute`, provided those tools
are backed by the current workspace root and do not write directly to Situ's
research ledger.

The durable storage model can remain general. The agent-facing tool name should
still describe the product action directly.
Use the product-model meanings in
[`../../specs/0003-product-primitives/SPEC.md`](../../specs/0003-product-primitives/SPEC.md)
and the evidence model in
[`../../specs/0010-activities-and-artifacts/SPEC.md`](../../specs/0010-activities-and-artifacts/SPEC.md)
when naming tools for measurement or result evidence. The model should not have
to call a generic activity writer to record benchmark evidence.

## Required Checks

- Put each durable Situ ledger tool in its own ownership folder:
  `tools/<domain>/<tool_name>/{tool.py,models.py,__init__.py}`.
- Build Situ ledger tools by subclassing `BaseSituTool` and exposing
  `.as_tool()` through a `FunctionToolset`.
- Prefer maintained package toolsets over hand-rolled wrappers for generic
  workspace operations such as shell execution, file reads, file edits, glob,
  and grep.
- Tool arguments and returns should be typed Pydantic models or concrete
  Pydantic-compatible primitives. Avoid unstructured catch-all payloads unless
  the domain object itself has a payload field.
- Prefer model-shaped tool names:
  `get_project_board`, `get_project`, `list_hypotheses`,
  `create_experiment`, `link_hypothesis_experiment`.
- Agent-facing state readers should default to the current project. Do not
  expose session/run selectors unless the tool is explicitly for inspecting run
  history; session IDs are internal provenance for the harness.
- Project objective and research context changes go through project-shaped
  tools such as `create_project` and `update_project`; do not expose separate
  objective or research-context CRUD tools.
- Prefer comment-shaped collaboration tools:
  `add_hypothesis_comment`, `add_experiment_comment`.
- Prefer result- or measurement-shaped tools for measurement evidence, following
  the current spec vocabulary. Do not add a spread of
  result/evidence/run/comment variants until the product clearly needs them.
- Do not expose a generic `record_activity(kind=...)` tool as the primary agent
  interface. The harness should store first-slice analysis, hypothesis,
  experiment, and task collaboration through product-shaped tools rather than
  generic activity writers.
- Do not expose `record_evaluation_activity` or similarly generic activity
  tools. The exposed tool should describe the higher-level product action.
- Harness-owned concern comments should stay harness-owned until there is a
  clear product need for an explicit agent tool.
- Mutation tools that append comments, create records, or link records should
  set `sequential = True` unless there is a clear reason they are safe to run in
  parallel.
- Tool implementations should call repositories or API services, not direct
  SQLite.
- Toolsets should include concise instructions that explain when to read state
  and when to write comments.
- Tool names should avoid obsolete or overly generic phrasing like
  `record_finding` or `record_activity` when a product-model operation is
  clearer. A compact context reader is acceptable in the slim slice, but prefer
  names that make the project scope obvious and keep session/run mechanics out
  of the agent-facing name.

## Red Flags

- A generic CRUD tool that takes `{model, action, payload}` instead of explicit
  typed tools.
- A generic context tool whose name exposes implementation perspective rather
  than product state.
- Agent-facing tools that ask the model to pass a `session_id` for routine
  project state reads.
- Agent-facing tools that ask the model to choose internal activity kinds for
  routine collaboration.
- Standalone objective or research-context tools. Those are Project fields, not
  separate agent-facing primitives.
- Tools that return loose dicts when a typed schema would be easy.
- Tools that duplicate repository SQL or bypass repository validation.
- Tool folders that collect many unrelated tools in one `tool.py`.
- Comment tools that silently write to the wrong session or omit the session
  context.

## Review Questions

- Could an agent infer the tool's purpose from the name alone?
- Does the tool map to a real product model or a familiar collaboration action?
- Is the storage detail hidden when it would make the model reason about
  implementation rather than work?
- Would the tool be straightforward to test through direct invocation?
- Does the tool surface make it easier to add more model CRUD without
  rethinking the architecture?
