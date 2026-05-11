---
name: situ-policy-no-silent-catch
description: Use whenever wrapping a try/catch in projects/app/src — new error handling, retry logic, fallback paths, or any code that swallows a thrown error.
---

# No Silent Catch

Every `catch` block does something with the error. An empty `catch` body
is banned.

## Why

A swallowed error is a future bug nobody can find. A `catch` that
explicitly logs, throws, returns a typed fallback, or transitions a
record makes the _intent_ visible — "we expect this to throw and
here's what we want to happen". An empty body says nothing.

## Rules

- A `catch` block must do at least one of:
  - **Log** via `logModule.error(...)` / `logModule.warn(...)` (see `situ-policy-logging`)
  - **Throw** — rethrow, wrap, or transform into a domain error
  - **Return a typed fallback** — explicit `return null`, `return {}`,
    `return undefined`, etc. The return type tells the reader the
    failure is the missing-data case.
  - **Transition a record to a failed state** —
    `researchTaskRepository.transition(...)`, `repository.cancel(...)`, etc.
- Conditional rethrow is allowed (and common):

  ```ts
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("duplicate column name")) {
      throw error;
    }
  }
  ```

  The condition documents the expected swallow case; everything else
  rethrows.

- Fallback returns may be the entire body (no log needed) when the
  return type makes the missing case unambiguous:

  ```ts
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
  ```

  This pattern is fine for path resolution, optional file reads, and
  similar best-effort operations.

## Avoid

- An empty `catch` body.
- `catch (error) { /* nothing */ }` with a comment that doesn't
  explain why the swallow is correct.
- A `catch` that returns `undefined` from a function whose return type
  is `string` (silent type lie).
- Swallowing in a hot loop without `logModule.warn` — debugging becomes
  guesswork.

## See also

- `situ-policy-logging`
- `situ-policy-error-throwing`
- `situ-policy-durable-records`
