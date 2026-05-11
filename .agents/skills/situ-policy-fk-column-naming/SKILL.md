---
name: situ-policy-fk-column-naming
description: Use whenever adding, renaming, or reviewing a foreign-key column or identifier field — repository row types, protocol records, drizzle schemas, or migration SQL.
---

# Foreign-Key Column Naming

`<entity>Id` in TypeScript, `<entity>_id` in SQL, with the relationship
in the prefix when it isn't the primary entity.

## Rules

- TS / drizzle column name: `<entity>Id: string` (camelCase, `Id` suffix).
- SQL column name: `<entity>_id` (snake_case, `_id` suffix). Drizzle
  maps via `text("entity_id")` → `entityId`.
- Primary key on a row is bare `id`, not `<entity>Id`.
- Relationship-bearing FKs use the relationship name as prefix:
  - `parentResearchTaskId` (self-referential parent)
  - `createdByResearchTaskId`, `createdByAgentId` (creator references)
  - `assigneeAgentId` (assignment)
  - `ownerAgentId`, `ownerWorkflowId` (ownership)
  - `associatedHypothesisId` (primary hypothesis)
  - `parentExperimentId` (self-referential parent)
- Optional FKs are `<col>: string | null` (not `?`) — see
  `situ-policy-protocol-record-types`.
- Composite-key columns in junction tables follow the same camelCase
  rule: `researchTaskId` + `blockedByResearchTaskId`.

## Exceptions

- Third-party SDK shapes keep their native casing at the boundary —
  Anthropic's `skill_id`, `custom_tool_use_id`, `environment_id`,
  `display_title` etc. cross our code as-is _only_ in modules that
  directly call the SDK (`claude/agents/resources/`,
  `claude/agents/skills/registry.ts`,
  `claude/agents/runs/execute-turn.ts`). Map to camelCase before
  surfacing into repositories or protocol records.

## Avoid

- Snake_case identifiers in TS outside the SDK boundary
  (`research_task_id: string` in a repository = bug).
- camelCase in SQL DDL (`researchTaskId TEXT` = bug; drizzle generates the
  wrong table).
- An FK named only after the column type (`agentId` when the column
  describes an _owner_ agent — should be `ownerAgentId`).
- Optional FKs typed as `string | undefined` instead of `string | null`.
- Double-suffix (`researchTaskIdId`, `entityIdRef`) — pick one.

## See also

- `situ-policy-protocol-record-types`
- `situ-policy-type-naming-suffixes`
- `situ-policy-entity-ids`
- `situ-policy-standard-schema-columns`
