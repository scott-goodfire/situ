from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

from evals.harness.logfire import configure_eval_observability
from evals.runner.discovery import collect_eval_classes
from evals.runner.execution import run_evals
from evals.runner.reporting import print_json, print_summary
from evals.runner.signals import has_report_failures

DEFAULT_MAX_CONCURRENCY = 4
_NOISY_LOGGERS = ["httpx", "httpcore", "openai", "logfire", "pydantic_ai"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Almanac evals.")
    parser.add_argument("path", nargs="?", default="evals/suites", help="Eval file or directory to run")
    parser.add_argument("--case", default=None, help="Run cases whose name contains this text")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_MAX_CONCURRENCY)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    parser.add_argument("--verbose", action="store_true", help="Print verbose eval inputs/outputs")
    parser.add_argument("--list", action="store_true", help="List discovered eval groups without running them")
    parser.add_argument("--task-retries", type=int, default=0, help="Retry failed task executions N times")
    parser.add_argument("--evaluator-retries", type=int, default=0, help="Retry failed evaluators N times")
    args = parser.parse_args(argv)

    if not args.verbose:
        quiet_noisy_loggers()

    eval_classes = collect_eval_classes(Path(args.path))
    if args.list:
        for name, cls in eval_classes:
            print(f"{name}\t{cls.__module__}.{cls.__name__}")
        return 0

    configure_eval_observability()

    if not eval_classes:
        print(f"No eval groups found in {args.path}", file=sys.stderr)
        return 1

    results, failures = run_evals(
        eval_classes,
        case_filter=args.case,
        max_concurrency=args.concurrency,
        task_retries=args.task_retries,
        evaluator_retries=args.evaluator_retries,
    )

    if args.json:
        print_json(results, failures)
    else:
        print_summary(results, failures, verbose=args.verbose)

    return 1 if failures or has_report_failures(results) else 0


def quiet_noisy_loggers() -> None:
    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)
