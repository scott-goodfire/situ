#!/usr/bin/env bash
set -euo pipefail

matches="$(
  rg \
    --glob 'projects/app/src/**/*.ts' \
    --glob 'projects/app/packages/*/src/**/*.ts' \
    --glob '!projects/app/packages/errors/src/**' \
    --glob '!**/*.test.ts' \
    --line-number \
    'throw new Error|throw Error' \
    projects/app/src projects/app/packages || true
)"

if [[ -n "$matches" ]]; then
  printf '%s\n' "Product code must throw @situ/errors structured errors:"
  printf '%s\n' "$matches"
  exit 1
fi
