---
name: situ-policy-error-throwing
description: Use whenever writing, catching, formatting, or reviewing thrown errors anywhere in projects/app/src — agent tools, repositories, CLI commands, HTTP routes, validation paths.
---

# Error Throwing

Two paths, picked by where the code lives. Agent tools and the repositories they call use the envelope contract; everything else throws plain `Error`.

## Why

Agent tools surface errors to the model as JSON. The model retries from the envelope, so the failure has to carry a stable `code`, an actionable `hint`, and any `details` the model needs to act — `not_found` with `{ hypothesisId }` lets it decide to create one or move on; a bare `"not found"` tells it nothing. CLI, routes, and scripts surface to humans (or to Hono's error handler), where plain `Error` messages are what the consumer reads.

## Rules

### Agent tool surface and the repositories they consume

Scope: `projects/app/src/claude/agents/tools/**` and `projects/app/src/data/repositories/**`.

- Tool handlers are declared via `defineTool({ ..., resultEnvelope: true })` and return `Result.ok(data)` from `tools/__shared__/result.ts`. Failures return `Result.fail({ code, hint, details? })`.
- Repositories throw `PreconditionError` (from `data/repositories/__shared__/precondition-error.ts`) for state preconditions and not-found cases. Pass `{ code, hint, details? }`:

  ```ts
  throw new PreconditionError({
    code: "not_found",
    hint: `Hypothesis not found: ${hypothesisId}`,
    details: { hypothesisId },
  });
  ```

- `defineTool`'s wrapper catches everything: `ZodError` becomes `{ ok: false, code: "invalid_input" }`, `PreconditionError` preserves its `code` / `hint` / `details`, anything else becomes `{ ok: false, code: "internal_error" }`. Handlers never set `is_error`.
- Codes are short snake_case identifiers (`not_found`, `invalid_state`, `conflict`). Hints are a single sentence the model can act on.

### Everywhere else

Scope: `projects/app/src/cli/**`, `projects/app/src/routes/**`, `projects/app/src/runtime/**` (outside the repository call sites), `projects/app/src/modules/**`, scripts, and one-off utilities.

- Use `throw new Error(...)`. No custom subclasses, no `Result<T, E>`, no envelope wrapping.
- Messages identify the entity, the operation, and the id when there is one:

  ```ts
  throw new Error(`Failed to claim compute target: ${id}`);
  throw new Error(`${recordLabel} id is required`);
  ```

- CLI and HTTP layers catch and translate to exit codes / status codes; never silent.

## Avoid

```ts
// Generic — nothing for the model or a human to act on
throw new Error("not found");
throw new Error("failed");
throw new Error("invalid input");

// Bare throw in a repository called from a tool — bypasses the envelope contract
throw new Error(`Hypothesis not found: ${hypothesisId}`);

// Manual envelope shape — use Result.fail / PreconditionError
return { ok: false, code: "not_found", hint: "..." };

// Setting is_error on a tool response — defineTool owns the wire shape
return { content: "...", is_error: true };
```

- Returning `null` to signal failure where a `require*` variant should throw.
- Introducing a new error subclass alongside `PreconditionError`.
- Plain `throw new Error(...)` inside a repository function whose only callers are agent tools — use `PreconditionError` so the envelope code survives.

## See also

- `situ-policy-agent-tool-surface`
- `situ-policy-find-require-pair`
- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-logging`
- `situ-add-tool`
