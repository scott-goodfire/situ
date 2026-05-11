---
name: situ-add-policy-skill
description: Use whenever adding a new situ-policy-* skill, drafting a policy proposal, or reviewing whether a recurring backend pattern deserves a policy.
---

# Situ Add Policy Skill

Policy skills live at `.agents/skills/situ-policy-<kebab>/SKILL.md` and
codify a review rubric — what to do, what to avoid.

## Naming

- File: `.agents/skills/situ-policy-<kebab>/SKILL.md`. No numbers; the
  name says what the rule is about, not how strict it is.
- Kebab is a noun-phrase for the pattern, not "no-bad-thing"
  (`situ-policy-error-throwing`, not "situ-policy-no-bad-errors" style).

## Frontmatter

```yaml
---
name: situ-policy-<kebab>
description: Use whenever <verb1>, <verb2>, or <verb3> <thing> in <path> — including <specific case 1>, <specific case 2>.
---
```

The description is the model's only signal for when to load the skill.
Push it: list multiple trigger verbs and concrete cases. Anthropic's
own guidance: _"Make sure to use this skill whenever the user mentions
X, Y, or Z, even if they don't explicitly ask."_ Aim for ~25 words.

## Scope

- Codify patterns that recur **3+ times** across the backend. Tight
  patterns (already uniform) are the most valuable to lock in.
- Narrow enough that one trigger surfaces it. If a trigger needs an
  "or", split the policy.
- Broad enough that the rule applies the same way at every site.

## Length

- Aim for **20–40 lines of body**. Past 60 lines, you're probably
  doing too much.
- A reviewer should read the whole skill in <30s.

## Body shape

1. One opening sentence stating the rule, with the path it governs.
2. `## Why` — 2–4 lines of rationale. Optional, but include for any rule
   where the "why" isn't obvious from the rule itself. Anthropic
   explicitly recommends explaining reasoning instead of writing
   "ALWAYS" or "NEVER" in caps.
3. `## Rules` — 4–7 concrete bullets, each greppable or review-spotable.
   Cite real paths/line numbers where it helps.
4. `## Exceptions` — optional. Use when the rule has documented carve-outs;
   list them with file paths and reasons.
5. `## Avoid` — 3–4 bullets on anti-patterns to spot in PR review.
6. `## See also` — optional. List sibling skill names so a model loading
   this one knows which related rules to pull.

Other optional sections: `## Slicing target`, `## Folders covered today`.

## Style

- Path-obvious: a reviewer must be able to tell where the rule applies
  in 5 seconds.
- Document legitimate exceptions explicitly. Name the file and the reason.
- Use `` `code` `` (double-backtick) for inline code containing
  backticks. `oxfmt` mangles backslash-backtick escape sequences and
  collapses surrounding lines.
- For shape rules (folder layout, function signature), include one
  fenced code block. Models pattern-match better from fenced code.
- No emojis.

## After writing

- `bun x oxfmt --check .agents` — fix formatting before commit.
- Optional: run `situ-run-policy-skill` against the new skill to confirm
  the codebase actually complies and the rule is real.

## See also

- `situ-run-policy-skill` — audit one policy against the codebase
- `situ-audit-policies` — sweep all policies against the codebase
- `situ-lint-policies` — structural lint of the policy set itself
- `situ-policy-workflow-skill-shape` — counterpart for workflow skills
