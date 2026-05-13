#!/usr/bin/env bash
set -euo pipefail

run_check_step() {
  printf '\n[check] %s\n' "$1"
  shift
  "$@"
}

run_check_step "format" mise run format:check -- .
run_check_step "lint" mise run lint -- .
run_check_step "markdownlint" mise run markdownlint
run_check_step "typos" mise run typos
run_check_step "actionlint" mise run actionlint
run_check_step "meta layer" mise run lint:policies
run_check_step "structured errors" mise run lint:errors
run_check_step "typecheck" bun x tsgo -b --pretty false
run_check_step "tests" mise run test
