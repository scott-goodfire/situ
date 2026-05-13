# `@situ/errors`

Shared application error types for Situ product code.

```bash
mise run check
mise run test
mise run coverage
```

This package owns structured error kinds and `BaseError` subclasses. Product
packages should throw these errors instead of plain `Error` instances so CLI,
HTTP, sync, scheduler, and agent-tool boundaries can handle failures by stable
`kind`.
