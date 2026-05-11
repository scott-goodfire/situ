---
name: situ-audit-policies
description: Use when checking whether this repo conforms to its situ-policy-* skills, finding policy violations, or recommending policy checks that should become tests.
---

# Situ Audit Policies

Audit code and docs against policy review rubrics under
`.agents/skills/situ-policy-*`. If the repo has no policies yet, say so
and recommend whether a policy is actually needed.

Default to findings and recommendations. Edit code or policy files only
when the user asks. To audit a single policy and apply fixes, use
`situ-run-policy-skill` instead.

## Frame the audit

```bash
find .agents/skills -maxdepth 1 -type d -name 'situ-policy-*' | sort
git status --short
```

Classify each policy check as:

- **mechanizable** — greppable or testable
- **judgment** — needs reviewer interpretation
- **mixed** — has both surfaces

## Evidence pass

For each policy:

1. Read its `## Rules` and `## Avoid` sections.
2. Map each rule to current code paths.
3. Run simple mechanizable checks.
4. Sample representative code for judgment checks.
5. Record file:line evidence.

Useful surfaces:

```bash
rg -n "SITU_|ANTHROPIC|secrets|process.env" projects/app/src commands config .github
rg -n "syncVersion|notifySyncChanged|nextSyncVersion" projects/app/src
rg -n "ClaudeAgentToolDefinition|roles:" projects/app/src/claude/agents/tools
rg -n "release|install|doctor|build_release" README.md config .github projects/app/src
```

## Recommended test coverage

When a rule is mechanizable, recommend a test or script. Examples:

- Every `situ-*` skill has matching frontmatter `name`.
- Release tarball contains required files.
- Installer passes shell syntax and local tarball smoke.
- Mutating helpers go through `runSyncedWrite`.
- Secrets are never printed by doctor/status endpoints.

## Report format

Lead with violations ordered by severity:

- policy file
- violated rule
- evidence path and line
- impact
- suggested fix

Then list mechanizable checks that should become tests. If no policies
exist, say so clearly and don't invent a full policy layer without a
concrete need.

## See also

- `situ-run-policy-skill` — single-policy version of this sweep
- `situ-lint-policies` — structural lint of the policy set itself
- `situ-curate-meta-layer` — judgment-heavy entropy reduction
- `situ-spec-policy-maintenance` — directory layout + deferred list
