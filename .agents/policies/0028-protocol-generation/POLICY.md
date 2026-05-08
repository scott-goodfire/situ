---
title: Protocol Generation
status: active
---

# Policy: Protocol Generation

## Applies To

Shared protocol models under `shared/python/protocol/src/situ/protocol/**`,
generated JSON schemas under `protocol/json-schema/**`, generated TypeScript
under `shared/typescript/protocol/src/generated.ts`, protocol exports, JSON-RPC
method contracts, collection event contracts, and
`scripts/generate-protocol.py`.

## Rule

The Python Pydantic protocol package is the source of truth for cross-process
and cross-language message shapes. JSON Schema and TypeScript protocol types
are generated artifacts.

Do not manually edit generated protocol outputs. Change the Python protocol
model, export it, include it in the generator when needed, regenerate, and then
update consumers.

## Required Checks

- Add or change shared message shapes in `shared/python/protocol/src/situ/protocol/`.
- Export protocol models from `situ.protocol` when they are used by the
  generator or package consumers.
- Add new generated models to `MODELS` in `scripts/generate-protocol.py`.
- Run `./commands/protocol-generate.sh` after protocol model changes.
- Commit regenerated `protocol/json-schema/*.schema.json` and
  `shared/typescript/protocol/src/generated.ts` when the source model changes.
- Keep `shared/typescript/protocol/src/generated.ts` generated-only. Manual
  TypeScript helpers belong in `shared/typescript/protocol/src/index.ts` or a
  separate non-generated module.
- JSON-RPC methods should have explicit params and result models when the shape
  is stable enough to cross package or process boundaries.
- Collection bootstrap, subscribe, and upsert payloads should use protocol
  record types rather than duplicate frontend-only shapes.
- Keep protocol models free of harness runtime behavior, repository logic,
  filesystem operations, and UI rendering concerns.
- Use broad payload fields only when the payload is intentionally flexible, such
  as evolving measurement metadata. Stable identities, ownership, statuses,
  links, and lifecycle fields should be typed.
- Run TypeScript checks after regeneration so drift is caught in consumers.

## Red Flags

- Editing `shared/typescript/protocol/src/generated.ts` by hand.
- Updating Python protocol models without regenerating JSON schemas and
  TypeScript types.
- Duplicating protocol record or RPC shapes manually in web, TUI, or shared
  TypeScript packages.
- Adding a cross-process method with loose `dict` or `Record<string, unknown>`
  params when a small model would make the contract reviewable.
- Putting app, repository, agent, or UI behavior inside the shared protocol
  package.
- Adding a new product record to backend state but forgetting collection and
  protocol surfaces that TUI/web/headless clients need.

## Review Questions

- Is this shape a wire contract or a local implementation detail?
- Is Python still the source of truth and TypeScript generated from it?
- Did every consumer see the same regenerated type?
- Are flexible payloads intentional, or should the field become a typed
  protocol contract?
