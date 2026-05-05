---
title: Agent Tool Surface
status: active
---

# Policy: Agent Tool Surface

## Applies To

Pydantic AI tools, toolsets, agent deps, agent-facing APIs, and code that lets
agents read or mutate Almanac research state.

## Rule

Agent tools should feel like explicit CRUD-style operations over Almanac product
models. Prefer concrete, inspectable tools such as `get_session`,
`create_hypothesis`, `update_experiment`, and `add_experiment_comment` over
abstract tools that ask the model to choose internal ontology details.

The durable storage model can remain general. For example,
`add_experiment_comment` may create an `ExperimentActivity(kind="comment")`.
The agent-facing tool name should still describe the product action directly.

## Required Checks

- Put each durable agent tool in its own ownership folder:
  `tools/<domain>/<tool_name>/{tool.py,models.py,__init__.py}`.
- Build tools by subclassing `BaseAlmanacTool` and exposing `.as_tool()` through
  a `FunctionToolset`, following the reference pattern from the Mem backend.
- Tool arguments and returns should be typed Pydantic models or concrete
  Pydantic-compatible primitives. Avoid unstructured catch-all payloads unless
  the domain object itself has a payload field.
- Prefer model-shaped tool names:
  `get_session`, `get_objective`, `list_hypotheses`,
  `create_experiment`, `link_hypothesis_experiment`.
- Prefer comment-shaped collaboration tools:
  `add_hypothesis_comment`, `add_experiment_comment`.
- Do not expose a generic `record_activity(kind=...)` tool as the primary agent
  interface. The harness should store first-slice collaboration as
  `kind="comment"` activities, with optional payload metadata for result,
  concern, plan, or interpretation comments.
- Harness-owned result and concern comments should stay harness-owned until
  there is a clear product need for an explicit agent tool.
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
  names that make the session/objective scope obvious.

## Red Flags

- A generic CRUD tool that takes `{model, action, payload}` instead of explicit
  typed tools.
- A generic context tool whose name exposes implementation perspective rather
  than product state.
- Agent-facing tools that ask the model to choose internal activity kinds for
  routine collaboration.
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
