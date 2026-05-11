---
name: situ-policy-type-naming-suffixes
description: Use whenever naming, modifying, or reviewing domain types in projects/app/src — DB row types, function-arg bag types, status unions, tool contexts, or results.
---

# Type Naming Suffixes

A small fixed vocabulary describes what each type is for.

## Rules

- `*Record` — DB row types: `ExperimentRecord`, `ComputeTargetRecord`. Or
  alias `typeof <table>.$inferSelect` directly inside the repository file.
- `*Input` — function-argument bag types in repositories and services:
  `CreateHypothesisInput`, `HypothesisIdInput`, `ListInput`, `SearchInput`.
- `*Options` — CLI flag bags and runtime configuration bags:
  `SelfUpdateOptions`, `RuntimeOptions`, `CommonReadOptions`. Use when
  the type represents configurable parameters with defaults.
- `*Status` — status enums and unions: `ResearchRecordStatus`,
  `ComputeTargetStatus`, `ResearchTaskStatus`.
- `*Context` — tool-handler context types: `ClaudeAgentToolContext`.
- `*Result` — tool-handler results: `ClaudeAgentToolResult`.

Suffixes describe the role of the type, not its data shape. A `*Input`
is always a function arg, never a DB row.

## Avoid

- A DB row exposed externally without a `*Record` alias (callers see raw
  drizzle inferred types).
- A repository or service argument type using `Args` / `Params` instead
  of `Input`. (`Options` is reserved for CLI/runtime config.)
- A status union without a `Status` suffix.

## See also

- `situ-policy-repository-function-vocabulary`
- `situ-policy-repository-module-shape`
