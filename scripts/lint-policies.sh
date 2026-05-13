#!/usr/bin/env bash
set -euo pipefail

fail=0

for ref in $(rg --no-filename -o 'ADR [0-9]{4}' .agents 2>/dev/null | awk '{print $2}' | sort -u); do
  if ! compgen -G ".agents/adrs/${ref}-*.md" >/dev/null; then
    echo "[lint:policies] missing ADR file for ADR $ref"
    fail=1
  fi
done

for file in .agents/adrs/*.md; do
  base="$(basename "$file")"
  number="${base%%-*}"
  heading="$(sed -n 's/^# \([0-9][0-9][0-9][0-9]\)\..*/\1/p' "$file" | head -n 1)"
  if [ "$number" != "$heading" ]; then
    echo "[lint:policies] ADR heading mismatch: $base has heading $heading"
    fail=1
  fi
done

exit "$fail"
