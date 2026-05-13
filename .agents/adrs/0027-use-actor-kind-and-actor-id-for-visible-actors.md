---
status: accepted
implementation_status: not_started
created: 2026-05-12
---

# 0027. Use Actor Kind And Actor Id For Visible Actors

## Context

The local app has human, agent, and system actors. It does not yet need a full
multi-user collaboration model.

Records still need visible authorship and ownership.

## Decision

Use explicit actor references:

```text
actorKind = "human" | "agent" | "system"
actorId = opaque id
```

Only `agent` actors require an `Agent` row. The local human and system actors can
be stable app-owned ids.

Use actor references for:

- task creator
- task assignee
- comment author
- review reviewer
- notification recipient
- event actor

## Consequences

The app can show visible authorship without introducing a users package.

Future multi-user support can replace or extend human actor handling with a real
user model when needed.

Package repositories store actor fields without knowing which boundary resolved
the actor.

## Related

- ADR 0010: Use App Actions As Shared Write Boundary
- ADR 0018: Use Task As Agent Work Item
