#!/usr/bin/env bash
set -euo pipefail

run_coverage_step() {
  printf '\n[coverage] %s\n' "$1"
  shift
  "$@"
}

rm -rf .coverage

run_coverage_step "app" mise run app:coverage
run_coverage_step "errors" mise run app:errors:coverage
run_coverage_step "common" mise run app:common:coverage
run_coverage_step "projects" mise run app:projects:coverage
run_coverage_step "tasks" mise run app:tasks:coverage
run_coverage_step "comments" mise run app:comments:coverage
run_coverage_step "notifications" mise run app:notifications:coverage
run_coverage_step "events" mise run app:events:coverage

printf '\n[coverage] reports written under .coverage/\n'
