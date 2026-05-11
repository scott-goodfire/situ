#!/usr/bin/env bash
# Mechanical lint of the .agents skill set.
# Catches cross-ref drift, stale sections, format mangling, voice
# slips, and missing required headings. Run via `mise run lint:policies`.
# The semantic equivalents live in `.agents/skills/situ-lint-policies/SKILL.md`.

set -e
fail=0

# 1. Cross-refs resolve. Sweep every SKILL.md (policy + workflow + meta).
for ref in $(rg --no-filename --only-matching --replace '$1' \
    '`(situ-policy-[a-z-]+)`' .agents/skills/*/SKILL.md | sort -u); do
  if [ ! -d ".agents/skills/$ref" ]; then
    echo "[lint:policies] MISSING ref: $ref"
    fail=1
  fi
done

# 2. Stale section names from the previous numbering era.
if rg -q 'Required Checks|Red Flags' .agents/skills --glob '!**/situ-lint-policies/**'; then
  echo "[lint:policies] stale ## Required Checks / ## Red Flags found"
  fail=1
fi

# 3. oxfmt backtick mangling (backslash-backtick collapses inline code).
if rg -qP '\\`' .agents/skills \
    --glob '!**/situ-lint-policies/**' \
    --glob '!**/situ-add-policy-skill/**'; then
  echo "[lint:policies] backslash-backtick mangle found"
  fail=1
fi

# 4. Description voice — policy skills should be pushy ("Use whenever").
if rg -q "^description: Use when " .agents/skills/situ-policy-*/SKILL.md; then
  echo "[lint:policies] non-pushy description in a policy skill"
  fail=1
fi

# 5. Description length — every SKILL.md, ~25 words / 240 chars max.
# Use first match only so template examples in code blocks don't double-count.
for f in .agents/skills/*/SKILL.md; do
  d=$(grep -m 1 "^description:" "$f" | sed 's/description: //')
  len=$(printf '%s' "$d" | wc -c)
  if [ "$len" -gt 240 ]; then
    echo "[lint:policies] description >240 chars: $f"
    fail=1
  fi
done

# 6. Required headings on policy skills.
for f in .agents/skills/situ-policy-*/SKILL.md; do
  if ! grep -q "^## Avoid" "$f"; then
    echo "[lint:policies] missing ## Avoid: $f"
    fail=1
  fi
  if ! grep -q "^## See also" "$f"; then
    echo "[lint:policies] missing ## See also: $f"
    fail=1
  fi
done

# 7. All-caps anti-pattern (Anthropic skill-creator: reframe, don't shout).
# situ-add-policy-skill and situ-lint-policies discuss the pattern itself.
if rg -q "ALWAYS|NEVER" .agents/skills \
    --glob '*SKILL.md' \
    --glob '!**/situ-add-policy-skill/**' \
    --glob '!**/situ-lint-policies/**'; then
  echo "[lint:policies] ALWAYS/NEVER all-caps found"
  fail=1
fi

# 8. mise run task references resolve.
# Policies and docs that reference `mise run <task>` should point to tasks
# actually defined in mise.toml. Catches stale tool references after task
# renames or removals.
defined_tasks=$(rg -oP '^\[tasks\."?([a-z0-9:-]+)"?\]' --replace '$1' mise.toml | sort -u)
referenced_tasks=$(rg --no-filename -oP '\bmise run \K[a-z][a-z0-9:-]*' \
  .agents/skills .agents/docs 2>/dev/null | sort -u)
for task in $referenced_tasks; do
  if ! echo "$defined_tasks" | grep -qx "$task"; then
    echo "[lint:policies] mise run $task referenced but not defined in mise.toml"
    fail=1
  fi
done

exit $fail
