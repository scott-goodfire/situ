---
title: Durable Records
status: active
---

# Policy: Durable Records

## Applies To

Record models under `projects/harness/src/situ/harness/records/**`, protocol
schemas that mirror durable records, activity records, link records, and
changes that add or reshape persisted product state.

## Rule

Durable records are storage-agnostic Pydantic envelopes for Situ product state.
They formalize identity, ownership, provenance, lifecycle, relationships, and
timestamps while keeping research semantics text-rich unless code must enforce
or query the structure.

Repositories own persistence. API services own read-side composition. Records
define the durable shape those layers pass around.

## Required Checks

- Each first-class persisted concept has its own directory:
  `records/<singular_concept>/record.py`.
- Record packages re-export their public record classes and enums through
  `records/<singular_concept>/__init__.py`; root `records/__init__.py` exports
  records used across backend boundaries.
- Main entity classes use the `<Entity>Record` naming pattern. Activity records
  use `<Entity>ActivityRecord`. Link records use explicit relationship names
  such as `HypothesisExperimentLinkRecord` or `TaskEntityLinkRecord`.
- Record modules contain Pydantic models, enums, parsers, and small validation
  helpers for the record shape only.
- Records do not import repositories, API services, DBOS, agents, tool code, or
  `sqlite3`.
- Records do not decode SQLite rows, know JSON column names, open files, run
  commands, or decide orchestration behavior.
- IDs, owner fields, status, timestamps, task-claiming fields, worktree
  provenance, and cross-record links are typed when code filters, joins,
  renders, gates, or validates them.
- Semantic fields such as objective, research context, analysis content,
  hypothesis rationale, experiment intent, interpretation, and activity body
  stay as strings unless multiple runtime paths need a stable typed field.
- Use payload metadata for evolving receipts such as command output summaries,
  metric bundles, workspace-state observations, raw tool results, and artifact
  references.
- Promote a payload key to a typed field only when UI grouping, repository
  queries, task dependencies, trust checks, comparability checks, or eval
  assertions depend on it.
- Each entity activity owns its own activity record and kind enum, such as
  `HypothesisActivityKind`, `ExperimentActivityKind`,
  `AnalysisActivityKind`, `TaskActivityKind`, and `EvaluationActivityKind`.
  Do not reintroduce a shared `ActivityKind`.
- Project-significant new records update the relevant product spec before code.
- New record persistence includes repository smoke coverage or an equivalent
  round-trip test path.

## Red Flags

- Adding a broad `records.py` file or a record module that holds multiple
  unrelated concepts.
- Returning loose `dict[str, Any]` for a durable product object when a record
  model should exist.
- Moving SQLite row mapping, JSON serialization, or SQL details into record
  modules.
- Adding a table without a corresponding record model and repository owner.
- Sharing one activity kind enum across unrelated entity activities.
- Formalizing qualitative research prose into many rigid fields before code
  needs to enforce or query them.
- Hiding critical relationships only in titles, comments, or payload blobs.
- Duplicating the same record shape separately in repository, API, and tool
  models without a clear boundary reason.

## Review Questions

- Is this record a durable product concept, not a temporary implementation
  object?
- Does the record know only its shape, not how it is stored or used?
- Are machine-critical fields typed and semantic content left readable?
- Are relationships represented as typed IDs or link records rather than prose?
- Will future repository, API, tool, and eval code know where this concept
  lives?
