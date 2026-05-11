#!/usr/bin/env bash
# Collect bun:test line coverage for projects/app.
# Runs each test:* script in its own bun process (they share DB state and
# can't be merged into a single invocation), writes per-script lcov to
# .coverage/app/<name>/lcov.info, then concatenates into a single
# .coverage/app/lcov.info that downstream tools can consume.

set -e
out=".coverage/app"
rm -rf "$out"
mkdir -p "$out"

groups=(
  "skills:src/claude/agents/skills/registry.test.ts"
  "tools:src/claude/agents/tools/registry.test.ts"
  "research-projects:src/runtime/dispatch/research-projects.test.ts"
  "settings:src/routes/settings.test.ts"
  "compute:src/runtime/compute/compute-leases.test.ts"
  "observability:src/config/log.test.ts src/config/observability.test.ts src/observability/names.test.ts src/observability/logger.test.ts"
  "repositories:src/data/repositories/repository-contracts.test.ts"
  "worktrees:src/runtime/worktrees/worktrees.test.ts"
)

for entry in "${groups[@]}"; do
  name="${entry%%:*}"
  files="${entry#*:}"
  dir="../../$out/$name"
  mkdir -p "$dir"
  echo "[coverage:app] $name"
  # shellcheck disable=SC2086
  bun test --coverage --coverage-reporter=lcov --coverage-dir="$dir" $files
done

cat "../../$out"/*/lcov.info > "../../$out/lcov.info"
echo "[coverage:app] wrote $out/lcov.info ($(grep -c "^SF:" "../../$out/lcov.info") records)"
