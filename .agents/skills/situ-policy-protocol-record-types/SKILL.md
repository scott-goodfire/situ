---
name: situ-policy-protocol-record-types
description: Use whenever adding, modifying, or reviewing a record type in @situ/protocol — entity records, foreign-key fields, timestamps, or status fields.
---

# Protocol Record Types

`@situ/protocol/records.ts` is the single source of truth for durable
record DTOs that cross the wire (server → Replicache → web).

`@situ/protocol/status.ts` owns status value unions and their runtime
arrays. `@situ/protocol/status-record.ts` owns the singleton runtime
status read model stored at the Replicache `status` key. Do not mix
that read model with status enum definitions.

## Rules

- Every durable wire record type is `export type <Entity>Record = { ... }`.
- Record fields match the explicit Replicache DTO emitted by
  `projects/app/src/routes/replicache-records/`, not raw Drizzle rows.
- Do not expose sync/storage columns such as `syncVersion`, `syncDeleted`,
  `payloadJson`, or `metadataJson`.
- If the server row stores JSON text, the protocol record carries the parsed
  object (`payload` or `metadata`) as `ProtocolPayload`.
- Use the ownership field the row actually has:
  `researchProjectId`, `researchTaskId`, `createdByResearchTaskId`,
  `agentId`, or entity-specific link keys. Do not add `sessionId` unless
  the table and wire DTO really have `sessionId`.
- Long-lived mutable entity records usually carry:

  ```ts
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ```

- Append-only activity, event, link, artifact, and measurement records may
  carry only `createdAt` when the schema has no `updatedAt`.
- `Timestamp` is the package-level alias `export type Timestamp = string;`
  — always use the alias, not raw `string`, when documenting an ISO date.
- Foreign keys are `<entity>Id: string | null` — explicit nullability,
  not `string | undefined`.
- Status fields are typed unions from `./status` (see
  `situ-policy-status-enum-pair`), never inline literal unions.

## Avoid

- A protocol type that describes idealized schema fields instead of the
  actual Replicache DTO.
- A record type that exposes `syncVersion`, `syncDeleted`, `payloadJson`, or
  `metadataJson`.
- Adding `sessionId` as a universal base field. Some current records are
  global, research-project-scoped, research-task-scoped, append-only, or
  link records.
- Inline status unions (`status: "triage" | "done"`) — extract to
  `./status`.
- `Timestamp` re-defined in another file.
- Optional `?` properties for foreign keys — use `| null`.
- A protocol record exposing storage details (`payloadJson` instead of
  the parsed object).

## See also

- `situ-policy-status-enum-pair`
- `situ-policy-json-columns`
- `situ-policy-hook-shape`
