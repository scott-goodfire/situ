# @situ/agent-tools

Generic framework for defining Claude Managed Agent custom tools backed by zod
input schemas and a typed JSON result envelope. Has zero situ-domain knowledge:
roles and tool context shape are type parameters bound by the consumer.

```ts
import { createDefineTool, Result } from "@situ/agent-tools";

type Role = "manager" | "scientist";
type Context = { agentId?: string; runId: string };

export const defineTool = createDefineTool<Role, Context>();

export const myTool = defineTool({
  name: "my_tool",
  description: "...",
  roles: ["manager"],
  inputSchema: z.object({ foo: z.string() }),
  resultEnvelope: true,
  handler: async ({ input, context }) => {
    if (!input.foo) {
      return Result.fail({
        code: "missing_foo",
        hint: "Pass a non-empty foo.",
      });
    }
    return Result.ok({ message: `received ${input.foo}` });
  },
});
```

## What's here

- **`createDefineTool<Role, Context>()`** — factory returning a `defineTool`
  function bound to your role and context types. Two overloads: a legacy
  shape (raw handler return → `JSON.stringify`) and the recommended
  envelope shape (`resultEnvelope: true`, handler returns `Result.ok` /
  `Result.fail`).
- **`Result.ok(data)` / `Result.fail({ code, hint, details? })`** — the
  envelope constructors. Failures carry a model-recoverable `code` and
  `hint`.
- **`AgentToolDefinition<Role, Context>`** — the wire-format definition
  the framework returns: extends Anthropic's `BetaManagedAgentsCustomToolParams`
  with `roles` and `handler`.
- **`AgentToolHandler<Context>`** / **`AgentToolResult`** — handler and
  result types.

## Error handling

The envelope handler wraps every call:

- **Zod parse failure** on `inputSchema` → `Result.fail({ code: "invalid_input", details: { issues } })`
- **`PreconditionError`** thrown from inside the handler →
  `Result.fail({ code: error.code, hint: error.hint, details: error.details })`.
  Re-export from `@situ/common`; throw it from repositories or domain
  helpers when a precondition the model can fix isn't met.
- **Any other thrown error** → `Result.fail({ code: "internal_error" })`
  with the tool name and message in `details`.

The legacy (non-envelope) handler does NOT wrap errors — it just stringifies
the return value. Prefer `resultEnvelope: true` for new tools.

## Testing

`bun --filter=@situ/agent-tools run test`.
