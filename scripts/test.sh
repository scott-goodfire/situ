#!/usr/bin/env bash
set -euo pipefail

run_test_step() {
  printf '\n[test] %s\n' "$1"
  shift
  "$@"
}

run_test_step "app" mise run app:test
run_test_step "common" mise run app:common:test
run_test_step "projects" mise run app:projects:test
run_test_step "tasks" mise run app:tasks:test
run_test_step "comments" mise run app:comments:test
run_test_step "notifications" mise run app:notifications:test
run_test_step "events" mise run app:events:test
