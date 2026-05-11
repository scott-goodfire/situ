---
name: situ-add-tool
description: Use when adding or changing an agent-facing custom tool in Situ's TypeScript Claude Managed Agent tool surface.
---

# Situ Add Tool

## Result Envelope

Every new tool MUST use `resultEnvelope: true` and return `Result.ok(data)` on
success. For state preconditions the model can't fix by retrying, throw
`PreconditionError` from the repository or from the tool handler — don't fold
those into the envelope as recoverable failures.

## Tool Surface

Agent-facing custom tools live in:

```text
projects/app/src/claude/agents/tools/<tool-name>.ts
projects/app/src/claude/agents/tools/__shared__/
projects/app/src/claude/agents/tools/types.ts
projects/app/src/claude/agents/tools/registry.ts
```

Tools are sent to Anthropic from `claudeAgentToolParamsForRole`, executed by
`executeClaudeAgentTurn`, and receive context through
`ClaudeAgentToolContext`.

## Before Editing

Read these files:

```bash
find projects/app/src/claude/agents/tools -maxdepth 1 -type f -name '*.ts' | sort
sed -n '1,220p' projects/app/src/claude/agents/tools/<tool-name>.ts
find projects/app/src/claude/agents/tools/__shared__ -maxdepth 1 -type f | sort
sed -n '1,220p' projects/app/src/claude/agents/tools/types.ts
sed -n '1,220p' projects/app/src/claude/agents/tools/registry.ts
sed -n '1,320p' projects/app/src/claude/agents/runs/execute-turn.ts
sed -n '1,260p' projects/app/src/data/db/schema.ts
```

If the tool mutates durable state, also read the matching repository module:

```bash
find projects/app/src/data/repositories -maxdepth 2 -type f | sort
sed -n '1,320p' projects/app/src/data/repositories/research-projects/research-project-repository.ts
sed -n '1,320p' projects/app/src/data/repositories/research-tasks/research-task-repository.ts
sed -n '1,320p' projects/app/src/data/repositories/research-task-verifications/research-task-verification-repository.ts
sed -n '1,320p' projects/app/src/data/repositories/experiments/experiment-repository.ts
```

## Design Rules

- Keep a single ownership point for each tool.
- Route durable state through `projects/app/src/data/repositories/*`; do not add
  compatibility helper modules or new direct SQL in tools.
- Every tool needs a concrete `description`, JSON `input_schema`, role list,
  and `handler`.
- Mutating tools must update `syncVersion` and call `notifySyncChanged`
  through the helper they use.
- Tool output should be JSON text through `toolResultModule.json`.
- Validate input with helpers from `tools/__shared__/`; do not trust arbitrary
  model input.
- Use `resultEnvelope: true` with `Result.ok` / `Result.fail` when the failure
  is model-recoverable (bad input, missing-but-fetchable precondition); use
  plain throws (`PreconditionError`) for guardrails the model can't fix by
  retrying (wrong role, headless project, situ bug).
- Use `context.activeResearchTaskId` when a tool can default to the active
  ResearchTask.
- Do not print or return secret values.
- Prefer general workspace command tools over bespoke file read/write/list
  tools. Keep custom tools for Situ-specific boundaries such as durable
  records, user checkpoints, compute allocation, worktree isolation, verifier
  judgments, and candidate capture.

## Role Placement

Use roles conservatively:

- `manager`: creating/revising the setup project baseline with
  `create_project_baseline`, presenting it with
  `present_baseline_for_confirmation`, planning ResearchTasks only after the
  confirmed baseline moves the project to `search`, defining workerPrompt and
  verificationPrompt, creating hypotheses from observed state, reading board
  state, asking the user, running read-only workspace inspection when needed,
  and completing/failing ResearchProjects.
- `scientist`: exploration hypotheses, experiments, baselines, evaluations,
  measurements, artifacts, entity links, read-only source inspection, and
  experiment worktree commands when the active task skill allows them.
- `verifier`: ResearchTaskVerification records, evidence checks, and
  pass/fail/suspicious/needs-more-evidence judgments. Verifiers may use
  read-only workspace commands for direct evidence checks, but should not
  mutate experiment worktrees or hypothesis lifecycle state.

Do not expose write tools to every role by default.

## Verification

Run:

```bash
bun --filter=@situ/app run check
bun --filter=@situ/app run test:tools
bun --filter=@situ/app run test:repositories
bun --filter=@situ/app run test:worktrees
mise run check
```

For runtime behavior, start with isolated state:

```bash
SITU_HOME="$PWD/dist/tool-smoke-state" mise run app -- --port 0
```

If the tool is exercised by a Claude run, inspect:

```bash
sqlite3 <db> "select type, payload_json, created_at from claude_agent_events order by created_at;"
sqlite3 <db> "select status,error_message,payload_json from claude_agent_runs order by created_at;"
```

Report which roles can see the tool, which helper persists state, and what
tests/checks were run.

## See also

- `situ-policy-error-throwing`
- `situ-policy-measurement-payload-shape`
