---
name: situ-policy-one-agent-tool-per-file
description: Use whenever adding, splitting, modifying, or reviewing Managed Agent custom tools under projects/app/src/claude/agents/tools.
---

# One Agent Tool Per File

Each Managed Agent custom tool lives in its own file.

## Rules

- A tool definition lives at `claude/agents/tools/<tool-name>.ts` and
  exports a single `ClaudeAgentToolDefinition` produced by `defineTool`.
- The file owns the tool's name, description, zod `inputSchema`, role list,
  and handler. Shared helpers (context fallback, entity-reference checks,
  transitions, result formatting) live in `claude/agents/tools/__shared__/`.
- Barrel `claude/agents/tools/index.ts` re-exports the tool definitions
  consumed by the rest of the app.
- File name and tool name match: kebab-case file, snake_case tool name
  (`record_measurement` ↔ `record-measurement.ts`).
- Tool registration lists each tool by import — no glob-based registration.

## Current state

The active tool surface is split into one file per tool. The old
`claude/agents/tools/situ-tools.ts` bundle should not exist. When a tool
changes, edit that tool's file and keep `registry.ts` as the explicit
import list.

## Avoid

- A new tool added inline to `situ-tools.ts` instead of its own file.
- Reintroducing a bundled `situ-tools.ts` file.
- A single file declares two or more tool definitions.
- A handler is large enough to deserve its own file but its description
  and schema live elsewhere — keep them together.
- A helper shared by tool siblings gets promoted to an app-wide module before
  it has callers outside `claude/agents/tools`.

## See also

- `situ-policy-agent-tool-surface`
- `situ-policy-file-size-and-slice-plan`
