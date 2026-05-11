---
name: situ-policy-app-modules
description: Use whenever adding, modifying, or reviewing package-wide module objects under src/modules — utilities such as dateTimeModule, jsonModule, textModule, logModule, or any new modules/<concept> folder.
---

# Package Modules

`src/modules/` is for small package-wide capability modules that do not belong
to a domain folder. In `projects/app`, that means helpers that do not belong to
`repositories/`, `runtime/`, `claude/`, or `routes/`. In web and eval packages,
the same shape applies to package-wide helpers that would otherwise become
loose utility files or duplicated local helpers.

Each module exposes a single object from its barrel:

```text
modules/date-time/
├── date-time-module.ts
├── index.ts
└── now-iso.ts
```

```ts
// modules/date-time/index.ts
export { dateTimeModule } from "./date-time-module";
```

```ts
// modules/date-time/date-time-module.ts
import { nowIso } from "./now-iso";

export const dateTimeModule = {
  nowIso,
} as const;
```

## Why

Module objects make shared helpers easy to find and extend without growing a
`utils.ts` grab bag. Callers depend on the module's public object, while the
implementation can still keep one operation per file.

## Rules

- Folder: `<package>/src/modules/<concept>/`, where `<concept>` is kebab-case
  (`date-time`, `json`, `log`, `command-line`).
- Public API: `index.ts` exports one module object named `<concept>Module`
  in camelCase (`dateTimeModule`, `jsonModule`, `textModule`, `logModule`).
- Callers import through the concept barrel:
  `import { dateTimeModule } from "../modules/date-time";`.
- Callers use methods on the module object:
  `dateTimeModule.nowIso()`, `jsonModule.parseRecord({ raw })`,
  `textModule.requiredText({ value, label })`, and
  `commandLineModule.requireValue({ argv, index, flag })`.
- Operation files can export functions for module assembly, but cross-folder
  callers do not deep-import those files.
- Module folders do not export `*` and do not use default exports.
- Do not add a root `modules/index.ts`; import the specific module concept.
- Modules are usually domain-neutral. They may import `node:*`, third-party
  libraries, other `modules/*`, or narrow technical facades such as
  `observability/`. A package may have a small domain-flavored module only when
  the package itself owns that domain surface, such as protocol status helpers
  or app-ui timeline math.
- Each operation has a co-located `*.test.ts` if its behavior has edge cases
  worth pinning.

## Avoid

- A `modules/utils/` or `modules/helpers/` folder bundling unrelated helpers.
- Exposing both a module object and the raw operation functions from
  `index.ts`.
- Adding mutable module-level state unless the module is explicitly wrapping
  a technical singleton, such as logging.
- Promoting domain-specific helper code into `modules/`; keep it near the
  domain that owns it.

## See also

- `situ-policy-file-naming`
- `situ-policy-barrel-exports`
- `situ-policy-timestamps`
