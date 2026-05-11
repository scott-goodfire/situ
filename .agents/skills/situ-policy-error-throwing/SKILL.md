---
name: situ-policy-error-throwing
description: Use whenever writing, catching, formatting, or reviewing thrown errors anywhere in projects/app/src — repositories, agent tools, CLI commands, HTTP routes, validation paths.
---

# Error Throwing

Throw plain `Error`s with messages that name the entity, the operation, and the id.

## Why

Errors cross the agent tool surface as text. The model retries from the message, so the message must contain everything the model needs to act — entity, operation, id. A generic `"not found"` tells the model nothing it can use; `Hypothesis not found: ${hypothesisId}` lets it decide whether to create one or move on.

## Rules

- Use `throw new Error(...)`. No custom subclasses, no `Result<T, E>`, no error codes.
- Messages identify the entity, operation, and id when there is one:

  ```ts
  throw new Error(`Hypothesis not found: ${hypothesisId}`);
  throw new Error(`Experiment was not persisted: ${experimentId}`);
  throw new Error(`Failed to claim compute target: ${id}`);
  throw new Error(`${recordLabel} id is required`);
  ```

- Validation in agent tool handlers throws with enough context for the model to retry — name the field and the expected shape.
- CLI and HTTP layers catch and translate to exit codes / status codes; never silent.

## Avoid

```ts
// Generic — model can't act on this
throw new Error("not found");
throw new Error("failed");
throw new Error("invalid input");
```

- Returning `null` to signal failure where a `require*` variant should throw.
- Introducing a custom error subclass.

## See also

- `situ-policy-find-require-pair`
- `situ-policy-mutations-via-runsyncedwrite`
- `situ-policy-logging`
