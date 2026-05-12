#!/usr/bin/env bash
set -euo pipefail

run_test_step() {
  printf '\n[test] %s\n' "$1"
  shift
  "$@"
}

run_test_step "Claude skill registry" bun --filter=@situ/app run test:skills
run_test_step "Claude tool registry" bun --filter=@situ/app run test:tools
run_test_step "Claude prompts and reconciliation" bun --filter=@situ/app run test:prompts
run_test_step "Claude role systems" bun --filter=@situ/app run test:roles
run_test_step "automation runtime" bun --filter=@situ/app run test:automation
run_test_step "research project runtime" bun --filter=@situ/app run test:research-projects
run_test_step "settings routes" bun --filter=@situ/app run test:settings
run_test_step "diagnostics" bun --filter=@situ/app run test:diagnostics
run_test_step "app modules" bun --filter=@situ/app run test:modules
run_test_step "compute leases" bun --filter=@situ/app run test:compute
run_test_step "observability" bun --filter=@situ/app run test:observability
run_test_step "repository contracts" bun --filter=@situ/app run test:repositories
run_test_step "experiment worktrees" bun --filter=@situ/app run test:worktrees
run_test_step "eval fixtures" bun --filter=@situ/evals-fixtures run test
run_test_step "eval worlds" bun --filter=@situ/evals-worlds run test
run_test_step "e2e runners" bun --filter=@situ/e2e-tests run test:runners
run_test_step "web packages" bun x vitest run
