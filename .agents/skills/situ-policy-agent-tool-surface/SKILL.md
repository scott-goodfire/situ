---
name: situ-policy-agent-tool-surface
description: Use whenever defining, modifying, exposing, or reviewing Managed Agent custom tools — including new tools, role-list changes, handler edits, schema updates, or tool description rewrites.
---

# Agent Tool Surface

Custom tools are the only way Managed Agents mutate Situ state.

## Why

Tool descriptions are the model's only signal for when to call a tool. A vague description means the model either spams the tool or ignores it. Role lists keep manager, scientist, and verifier tools aligned to the behavior each role owns.

## Rules

- Each tool defines: name, concrete description, zod `inputSchema`, role list, handler.
- Tools are declared via `defineTool` from `claude/agents/tools/__shared__/define-tool.ts`. The helper derives the wire-format JSON schema from the zod schema and runs `inputSchema.parse(input)` before invoking the handler, so handlers receive a fully typed and validated input.
- Write tools (`create_*`, `update_*`, status transitions) are exposed only to roles that own the behavior. Read tools can be wider.
- Context fallback (`researchProjectId`, `researchTaskId`) goes through
  `toolContextModule` — pass the parsed value as `explicit`, never re-parse.
- Repeated tool-only helpers (entity-reference assertions, transitions,
  result formatting) live in `claude/agents/tools/__shared__/`.
- Tool results return concise JSON text. Never include secrets.
- Tool results conform to the result envelope: success is
  `{ ok: true, data }`, failure is `{ ok: false, code, hint, details? }`.
  Use `defineTool({ ..., resultEnvelope: true })` and return
  `Result.ok(data)` for success.
- Handlers signal failure with `Result.fail({ code, hint, details })` for
  local control flow, or let repository `PreconditionError` propagate —
  the wrapper catches it and emits the envelope. Never `throw new
Error(...)` from a handler.
- Role prompts and runtime skills mention only tools available to that role.
- Prefer bash-oriented workspace command tools for repository inspection,
  candidate edits, and experiment execution. Add bespoke custom tools only
  when the operation must cross a Situ boundary: durable state, user
  interaction, compute allocation, worktree isolation, verification records,
  or artifact capture.

## Avoid

- A broad write tool exposed to all roles.
- A handler writing SQL directly when a typed repository helper exists.
- File-by-file read/write/list tools when a role-scoped workspace command tool
  can do the job.
- Vague descriptions — the model can't infer when to call the tool.
- Hand-rolled JSON schemas, manual input parsing, or tool definitions that
  bypass `defineTool` — the helper is the only sanctioned way to declare a
  custom tool.
- Bare strings, raw payloads, or thrown errors that escape the envelope —
  the agent only reads `{ ok, data | code, hint }` shaped results.
- `is_error: true` returns or other ad-hoc failure flags — failures are
  always structured envelopes with a stable `code` the agent reads.

## See also

- `situ-policy-one-agent-tool-per-file`
- `situ-policy-agent-role-folder-shape`
- `situ-add-tool`
- `situ-policy-error-throwing`
