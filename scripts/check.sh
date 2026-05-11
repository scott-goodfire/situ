#!/usr/bin/env bash
set -euo pipefail

run_check_step() {
  printf '\n[check] %s\n' "$1"
  shift
  "$@"
}

run_check_step "format: oxfmt --check" bun x oxfmt --check
run_check_step "lint: oxlint" bun x oxlint
run_check_step "lint: markdownlint" bun x markdownlint-cli2
run_check_step "lint: typos" typos
run_check_step "lint: GitHub Actions" actionlint
run_check_step "lint: .agents policies" mise run lint:policies
run_check_step "typecheck: TypeScript project references" bun x tsgo --build
run_check_step "typecheck: @situ/app" bun --filter=@situ/app run check
run_check_step "check: CLI command registry" bun --filter=@situ/app run check:cli
run_check_step "check: CLI docs coverage" bun --filter=@situ/app run check:cli-docs
run_check_step "test: CLI parser" bun --filter=@situ/app run test:cli
run_check_step "test: Claude skill registry" bun --filter=@situ/app run test:skills
run_check_step "test: Claude tool registry" bun --filter=@situ/app run test:tools
run_check_step "test: Claude prompts and reconciliation" bun --filter=@situ/app run test:prompts
run_check_step "test: automation runtime" bun --filter=@situ/app run test:automation
run_check_step "test: research project runtime" bun --filter=@situ/app run test:research-projects
run_check_step "test: settings routes" bun --filter=@situ/app run test:settings
run_check_step "test: diagnostics" bun --filter=@situ/app run test:diagnostics
run_check_step "test: app modules" bun --filter=@situ/app run test:modules
run_check_step "test: compute leases" bun --filter=@situ/app run test:compute
run_check_step "test: observability" bun --filter=@situ/app run test:observability
run_check_step "test: repository contracts" bun --filter=@situ/app run test:repositories
run_check_step "test: experiment worktrees" bun --filter=@situ/app run test:worktrees
run_check_step "typecheck: @situ/evals" bun --filter=@situ/evals run check
run_check_step "test: eval suites" bun --filter=@situ/evals run test
run_check_step "typecheck: @situ/evals-fixtures" bun --filter=@situ/evals-fixtures run check
run_check_step "test: eval fixtures" bun --filter=@situ/evals-fixtures run test
run_check_step "typecheck: @situ/evals-worlds" bun --filter=@situ/evals-worlds run check
run_check_step "test: eval worlds" bun --filter=@situ/evals-worlds run test
run_check_step "test: web packages" bun x vitest run
run_check_step "typecheck: e2e tests" bun --filter=@situ/e2e-tests run check
