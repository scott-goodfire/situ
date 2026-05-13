#!/usr/bin/env bash
set -euo pipefail

run_test_step() {
  printf '\n[test] %s\n' "$1"
  shift
  "$@"
}

run_test_step "app" mise run app:test
run_test_step "errors" mise run app:errors:test
run_test_step "agents" mise run app:agents:test
run_test_step "agent-sessions" mise run app:agent-sessions:test
run_test_step "common" mise run app:common:test
run_test_step "projects" mise run app:projects:test
run_test_step "tasks" mise run app:tasks:test
run_test_step "experiments" mise run app:experiments:test
run_test_step "measurements" mise run app:measurements:test
run_test_step "artifacts" mise run app:artifacts:test
run_test_step "reviews" mise run app:reviews:test
run_test_step "worktrees" mise run app:worktrees:test
run_test_step "comments" mise run app:comments:test
run_test_step "notifications" mise run app:notifications:test
run_test_step "events" mise run app:events:test
