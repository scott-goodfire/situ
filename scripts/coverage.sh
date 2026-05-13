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
run_coverage_step "agents" mise run app:agents:coverage
run_coverage_step "agent-sessions" mise run app:agent-sessions:coverage
run_coverage_step "common" mise run app:common:coverage
run_coverage_step "projects" mise run app:projects:coverage
run_coverage_step "tasks" mise run app:tasks:coverage
run_coverage_step "experiments" mise run app:experiments:coverage
run_coverage_step "measurements" mise run app:measurements:coverage
run_coverage_step "artifacts" mise run app:artifacts:coverage
run_coverage_step "reviews" mise run app:reviews:coverage
run_coverage_step "worktrees" mise run app:worktrees:coverage
run_coverage_step "comments" mise run app:comments:coverage
run_coverage_step "notifications" mise run app:notifications:coverage
run_coverage_step "events" mise run app:events:coverage

printf '\n[coverage] reports written under .coverage/\n'
