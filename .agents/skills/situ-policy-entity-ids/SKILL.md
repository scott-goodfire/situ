---
name: situ-policy-entity-ids
description: Use whenever generating identifiers for new entity rows — repository create methods, sessions, agent records, work-item claim tokens, or any identifier that goes into a row.
---

# Entity IDs

Default to `crypto.randomUUID()`. A small set of intentional exceptions exists for ergonomic identifiers and operational tokens.

## Why

`crypto.randomUUID()` is the boring default — opaque, unique, no per-entity machinery. The documented exceptions exist for a reason: some IDs need to be operationally readable (sessions surfacing in `~/.situ/registry.json`), some are singleton (one row per agent role), some aren't entity IDs at all (typed tokens stored in `ownerWorkflowId`).

## Rules

- Repository `create` methods: `const <entity>Id = crypto.randomUUID();` — no prefix, no suffix.
- No third-party ID libraries (`ulid`, `nanoid`, `uuid`, `hashids`).
- Test fixtures may use deterministic strings; production paths always go through `crypto.randomUUID()`.
- IDs cross the agent tool surface as opaque strings — agents never construct them.

## Exceptions

- **Singleton role records** — `claude/agents/roles/<role>/blueprint.ts` keys `claudeAgents` rows by role name (`"manager"`, `"scientist"`, `"verifier"`). One row per role; readable IDs beat opaque ones.
- **Session IDs** — `config/session-context.ts:createSessionId` produces `ses_<utc-stamp>_<8-char-uuid>` so sessions sort by recency in `~/.situ/registry.json`.
- **Operational tokens** — `work-items/claim-work-item.ts:claimToken` prepends a `scheduler:` namespace. These aren't row primary keys; they live in columns like `ownerWorkflowId`.

## Avoid

- A new entity adds a custom prefix without a documented reason in the exceptions list above.
- An ID is computed from entity contents (hash of title, etc.) instead of randomly generated.
- A repository's `create` accepts an externally supplied id — use `upsert` if you need that.
- Importing a third-party ID library.

## See also

- `situ-policy-type-naming-suffixes`
