#!/usr/bin/env bash
# Forbid bare `throw new Error(...)` in agent tools and repository code.
#
# These layers must throw typed errors (PreconditionError) so the tool
# envelope can map them to structured { ok: false, code, hint } results
# the agent can introspect. Bare Error throws bubble out as opaque
# "internal_error" responses and previously killed agent runs entirely.
# See: data/repositories/__shared__/precondition-error.ts and
# claude/agents/tools/__shared__/define-tool.ts.

set -e
fail=0

scopes=(
  "projects/app/src/claude/agents/tools"
  "projects/app/src/data/repositories"
)

for scope in "${scopes[@]}"; do
  matches=$(rg --no-heading --line-number 'throw new Error\(' "$scope" \
    --glob '!**/*.test.ts' \
    --glob '!**/precondition-error.ts' \
    || true)
  if [ -n "$matches" ]; then
    echo "[lint:no-bare-throws] bare 'throw new Error(...)' found in $scope:"
    echo "$matches" | sed 's/^/  /'
    echo "  Replace with: throw new PreconditionError({ code, hint, details });"
    echo "  Import from: data/repositories/__shared__"
    fail=1
  fi
done

exit $fail
