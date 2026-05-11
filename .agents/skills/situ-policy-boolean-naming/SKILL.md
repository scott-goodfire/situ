---
name: situ-policy-boolean-naming
description: Use whenever adding, renaming, or reviewing a boolean field, prop, or return type — repository row types, protocol records, function signatures, component props, or CLI options.
---

# Boolean Naming

A reader should be able to tell from the name that a value is boolean.
Use a small fixed set of prefixes and suffixes; reserve bare names for
DOM-aligned props and CLI flags.

## Rules

- Domain booleans use a recognizable prefix or suffix:
  - **`is*`** — state: `isActive`, `isStale`, `isPrimary`
  - **`has*`** — possession: `hasAnthropicKey`, `hasPermission`
  - **`can*`** — capability: `canTransition`, `canRetry`
  - **`should*`** — advisory: `shouldNotify`, `shouldRebuild`
  - **`*Configured`** — setup state: `anthropicKeyConfigured`
  - **`*Enabled`** — feature toggle: `defaultToolsetEnabled`,
    `schedulerEnabled`
  - **`*Required`** — gating: `keyRequired`, `signatureRequired`
  - **`*Known`** — derived presence: `poolKnown`
  - **`*Changed`** — "did something happen during this call":
    `stateChanged`, `recordChanged`
  - **`*-able`** suffix — capability adjective: `writable`, `readable`
  - **Past-participle `*-ed` adjectives** — state-as-adjective:
    `truncated`, `inferredFromTask`, `outputTruncated`. The `-ed`
    suffix tells the reader the value is a state flag, not an action.
- **Common command-result fields** — `success`, `failure`, `timedOut`
  in subprocess / process-result types. These match Node and Bun
  process-result vocabulary; renaming them costs more than it gains.
- **CLI flag bag fields** match the flag name as written
  (`json: boolean`, `resume: boolean`, `all: boolean`, `follow: boolean`,
  `force: boolean`). They're DOM-style flags, not domain booleans.
- **DOM / JSX props** that mirror HTML attributes accept the native
  spelling (`disabled`, `required`, `checked`, `readOnly`).
- **Internal options-bag fields** with conventional flag-style meaning
  (`notify`, `force`) can be bare when the bag describes an internal
  helper's behavior, not a domain entity.
- A name that _looks_ boolean but is actually a timestamp gets the
  `At` suffix: `completedAt: Timestamp`, not `completed: boolean` (use
  `isComplete` only when the boolean stands alone).
- Boolean function returns follow the same rules:
  `function hasAnthropicKey(): Promise<boolean>`.

## Avoid

- Past-tense verbs as boolean names: `completed`, `failed`, `deleted`
  — almost always a timestamp in disguise. Prefer `*At`.
- Negative names: `notReady`, `disabledNot`, `isNotConfigured` —
  invert the polarity (`isReady`, `disabled`, `isConfigured`).
- Bare adjectives outside the DOM/CLI exception list
  (`healthy`, `valid` — should be `isHealthy`, `isValid`).
- `flag: boolean` — name the flag.
- Optional booleans as `boolean | undefined` when `boolean` with a
  default would do.

## See also

- `situ-policy-type-naming-suffixes`
- `situ-policy-protocol-record-types`
- `situ-policy-cli-command-shape`
