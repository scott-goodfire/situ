---
status: accepted
implementation_status: verified
created: 2026-05-12
---

# 0041. Complete Replicache Sync Contract

## Context

ADR 0018 makes Replicache push the primary write API. A basic push and pull
surface is not enough for a real local-first web app. The sync contract must
make record visibility, deletes, idempotency, and package ownership explicit so
future packages can join sync without inventing their own protocol.

## Decision

Situ will use one app-level Replicache sync contract composed from package-owned
serializers.

Every synced product record includes:

- `id`
- `syncVersion`
- `syncDeleted`
- `createdAt`
- `updatedAt`, except append-only records where updates are not part of the
  model

Deletes are synced as tombstones. A deleted record remains visible to pull until
all clients that need the tombstone can observe it. Package repositories should
not hard-delete synced product records unless a package-specific ADR says that
history can be discarded.

The app sync layer owns system sync tables:

- `replicache_clients`
- `replicache_mutations`
- `sync_state`

Package sync modules own only product serialization:

```text
@situ/tasks
  key: tasks/<id>
  value: public task record

@situ/notifications
  key: notifications/<id>
  value: public notification record
```

The app pull route registers package serializers explicitly. A table does not
sync merely because it exists.

Replicache push applies mutations in order. Each mutation maps to exactly one
app action. The push route records the client mutation id in the same
transaction as the app action so retries are idempotent.

Pull returns only records changed since the client cookie when a cookie is
present. A full snapshot is allowed only when the client has no cookie or the
server cannot safely compute a delta.

## Consequences

Package repositories may create and update product records, but they do not own
Replicache protocol mechanics.

App actions that change synced records must bump sync metadata for every
changed record in the same transaction.

Mutation handlers must reject raw table patches. Mutations should stay close to
user-visible actions such as `task/assign`, `comment/create`, and
`review/create`.

Pull values should be stable public records. They should not expose private
Claude transport payloads, secrets, local filesystem internals, or bulky
artifact bodies.

If a package needs special deletion semantics, key prefixes, or pull filtering,
that belongs in the package sync module and package README.

## Related

- ADR 0018: Use Replicache Push As Primary Write API
- ADR 0021: Use App Actions As Shared Write Boundary
- ADR 0022: Define Common Package Contract
