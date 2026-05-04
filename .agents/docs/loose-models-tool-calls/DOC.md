# Loose Models, Tool Calls, And Hooks

This doc captures a design preference for Almanac's agent-facing architecture.
It is not a product surface by itself. It should guide future implementation
when adding proposal generation, worker orchestration, DBOS workflows, and
observability.

## Core Preference

Prefer loose semantic content with small typed envelopes.

Almanac should avoid over-modeling the agent's reasoning into many rigid fields
too early. LLMs are good at interpreting ambiguous research context, generating
natural-language plans, and adapting to messy user/project inputs. The durable
system should preserve that flexibility instead of forcing every concept into a
premature schema.

Use structured models for the parts that need software guarantees:

- Identity
- Ordering
- Status
- Ownership
- Links between records
- Tool invocation state
- Evidence attachment
- Trust warning attachment
- TUI rendering boundaries

Use text or lightly structured content for the parts that are mostly semantic:

- Proposal rationale
- Research plan
- Experiment intent
- Worker interpretation
- Finding text
- Risk notes
- User/project context
- Ambiguous evaluation instructions

## Proposal Shape

Do not start with a heavily opinionated proposal model like:

```python
class ExperimentProposal(BaseModel):
    intent: str
    change_summary: str
    components: list[str]
    based_on: list[str] = []
    rationale: str
    expected_signals: list[str] = []
    risk_notes: list[str] = []
```

That can be useful later if implementation pressure proves those fields are
stable. For now it is too specific. It assumes Almanac already knows the right
axes of decomposition.

Prefer a looser shape:

```python
class Proposal(BaseModel):
    id: str
    run_id: str
    content: str
    status: str
    source: str
```

Optional metadata can be added when it supports execution or observability, but
the semantic center should remain `content`.

The harness can ask the LLM to include useful sections in the text, such as
intent, why this might help, what to run, what evidence to inspect, and what
could go wrong. Those sections are guidance for the model and reader, not a
hard storage schema.

## Tool Calling First

Most active behavior should be modeled as tool calls.

Instead of inventing separate orchestration abstractions for every action,
prefer a common tool-call lifecycle:

```text
proposal text
  -> tool call requested
  -> tool call accepted or rejected
  -> tool call started
  -> tool call produced output
  -> evidence/signals/warnings/findings updated
```

Useful examples:

- Propose next research step
- Run baseline
- Run experiment
- Invoke worker
- Parse worker output
- Inspect diff
- Evaluate evidence
- Extract finding
- Update run state

The harness should own which tools exist and whether a call is allowed. The LLM
can request or choose tool calls, but it should not bypass the harness ledger.

## DBOS Role

DBOS should power durable execution of tool calls.

The desired mental model:

```text
LLM / harness requests tool call
  -> DBOS durable execution boundary
      -> tool implementation runs
      -> output is captured
  -> Almanac ledger records result
```

Avoid building a separate complex workflow engine in Almanac unless the simple
tool-call model stops being enough. DBOS should make tool execution durable and
recoverable; Almanac should focus on product state and observability.

## Observability Hooks

Observability should be powered by hooks around the lifecycle rather than
bespoke logging inside every feature.

The preferred hook points:

```text
before_tool_call
after_tool_call
on_tool_error
before_worker_message
after_worker_message
after_evidence_recorded
after_warning_created
after_finding_updated
```

Hooks can emit:

- Almanac events
- Logfire spans
- TUI notifications
- Debug artifacts
- Future audit records

Hooks should observe and enrich. They should not become the hidden owner of core
state transitions.

## Practical Boundary

The first durable records should look more like envelopes than taxonomies:

```text
Run
  id, status, created_at, config, current_state

Proposal
  id, run_id, content, status, source

AgentMessageHistory
  id, run_id, agent_name, pydantic_run_id?, conversation_id?, messages_json

Evidence
  id, run_id, experiment_id, summary, signals, raw

Finding
  id, run_id, content, evidence_ids

Warning
  id, run_id, experiment_id?, kind, message
```

The exact implementation can differ, but the principle should hold: keep the
software-critical envelope typed, and keep the research semantics text-rich.

## Review Questions

When adding a new model, tool, workflow, or observability path, ask:

- Does this field need to be machine-enforced now, or can it live in text?
- Is this structure stable across different research domains?
- Is this action better represented as a tool call?
- Can DBOS make this tool call durable without extra orchestration machinery?
- Can hooks provide the needed observability without coupling the feature to
  logging code?
- Does the harness still own the ledger, trust checks, and run state?

The bias should be: fewer rigid data models, more typed execution envelopes,
more tool-call-shaped behavior, and hook-driven observability.

## Current Implementation Direction

The first code layer should mirror the lightweight Pydantic AI patterns used in
the reference backend:

- `BaseAlmanacTool` owns name, typed result shape, permission check, execution,
  error normalization, and conversion to a Pydantic AI tool.
- `AlmanacToolDeps` carries the run context, repositories, worker manager, and
  event emitter into tool calls.
- Toolsets group related tools and carry tool-specific instructions.
- `AgentMessageHistoryRepository` stores Pydantic AI message history as the
  durable transcript for context replay and later inspection.
- Capabilities/hooks emit live tool-call observability events; derived tool-call
  views can be built from Pydantic messages later if querying raw messages
  becomes too awkward.

This should not force the entire run loop to become autonomous immediately. It
is acceptable for the deterministic MVP loop to call a tool directly while the
agent layer matures, as long as durable message history and context-passing are
real.
