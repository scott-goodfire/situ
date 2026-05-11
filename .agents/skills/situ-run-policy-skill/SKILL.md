---
name: situ-run-policy-skill
description: Use when auditing the codebase against one situ-policy-* skill and fixing the drift it surfaces.
---

# Situ Run Policy Skill

Walk one policy end-to-end: audit, decide policy-vs-codebase, fix, verify.
The cycle is the unit of work.

## Procedure

1. **Read the skill fully.** `## Rules` defines what to verify; `## Avoid`
   defines anti-patterns. Both matter.
2. **Run mechanical checks first.** `rg` for greppable patterns
   (counts, file lists, name matches). `Read` for judgment cases.
3. **Spot-check 2–3 representative call sites** for any rule that isn't
   fully mechanical.
4. **Classify each finding:**
   - **Codebase fix** — the rule is right; the code drifted. Apply the
     smallest edit that restores compliance. Don't refactor surrounding code.
   - **Policy fix** — the code is doing the right thing for a real
     reason; the rule is over-strict or missing an exception. Update
     the skill to acknowledge the exception by name + path.
   - **Both** — rare. The rule needs tightening AND code needs fixing.
5. **Verify.** Run `bun --filter=@situ/app run check` (and
   `bun x oxfmt --check projects/app/src .agents` for format). Use the
   app-only check when web/web-app-ui has unrelated breakage that blocks
   `mise run check`.
6. **Re-audit.** Re-run the mechanical greps. The compliant codebase
   should produce zero violations under the (possibly updated) rule.

## Decision heuristics

- **Tight pattern + a few drifters** → codebase fix. Restoring uniformity
  is cheap; the policy's value is the lock-in.
- **One real divergence with a clear domain reason** → policy fix.
  Document the exception so it doesn't get audited away later (singleton
  IDs, atomic-increment SQL, technical-utility folders, CLI option bags).
- **Wording mismatch between Rules and Avoid** → align them. The Avoid
  bullet is usually the more precise statement.
- **Stale "Current consolidation work" sections** → drop them. Skills
  describe rules; the audit is the source of truth for current state.
- **Refactors the rule implies but doesn't strictly require** (slice
  plans, barrels, large helper splits) → defer. Mark as the next
  refactor target inside the skill.

## Self-audit red flags

- You proposed a "policy fix" because the code fix would be a lot of
  work — wrong reason.
- You proposed a "code fix" that touches 10+ files for what should have
  been a one-line policy clarification — the rule is probably wrong.
- You added an exception without naming the file and the reason — future
  you can't tell if it's still valid.
- `mise run check` had pre-existing breakage from outside your scope —
  switch to the narrower per-workspace check and note the drift.

## After

- One-line summary in chat: skill name, codebase-or-policy, what changed.
- Move on to the next policy. Don't bundle multiple audits into one decision.

## See also

- `situ-audit-policies` — sweep all policies (the broader version of this skill)
- `situ-add-policy-skill` — author a new policy skill
- `situ-lint-policies` — structural lint of the policy set
- `situ-curate-meta-layer` — judgment-heavy curation across `.agents/`
