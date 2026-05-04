from __future__ import annotations

import argparse
import inspect
import json
import logging
import subprocess
import sys
from importlib import util
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic_evals.reporting import EvaluationReport

from evals.harness.base import BaseAlmanacEvalGroup
from evals.harness.logfire import configure_eval_observability

AI_EVALS_ROOT = Path("evals")
DEFAULT_MAX_CONCURRENCY = 4
DEFAULT_TASK_RETRIES = 1

_NOISY_LOGGERS = ["httpx", "httpcore", "openai", "logfire", "pydantic_ai"]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run Almanac AI evals.")
    parser.add_argument("path", nargs="?", default="evals/suites", help="Eval file or directory to run")
    parser.add_argument("--case", default=None, help="Run cases whose name contains this text")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_MAX_CONCURRENCY)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON")
    parser.add_argument("--verbose", action="store_true", help="Print verbose eval inputs/outputs")
    parser.add_argument("--list", action="store_true", help="List discovered eval groups without running them")
    args = parser.parse_args(argv)

    if not args.verbose:
        _quiet_noisy_loggers()
    configure_eval_observability()

    eval_classes = collect_eval_classes(Path(args.path))
    if args.list:
        for name, cls in eval_classes:
            print(f"{name}\t{cls.__module__}.{cls.__name__}")
        return 0

    if not eval_classes:
        print(f"No eval groups found in {args.path}", file=sys.stderr)
        return 1

    results, failures = run_evals(
        eval_classes,
        case_filter=args.case,
        max_concurrency=args.concurrency,
    )

    if args.json:
        print_json(results, failures)
    else:
        print_summary(results, failures, verbose=args.verbose)

    return 1 if failures or has_report_failures(results) else 0


def _quiet_noisy_loggers() -> None:
    for name in _NOISY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def run_evals(
    eval_classes: list[tuple[str, type[BaseAlmanacEvalGroup[Any, Any]]]],
    *,
    case_filter: str | None,
    max_concurrency: int,
) -> tuple[list[tuple[str, EvaluationReport[Any, Any, Any]]], list[str]]:
    session_id = str(uuid4())[:8]
    git_sha = current_git_sha()
    results: list[tuple[str, EvaluationReport[Any, Any, Any]]] = []
    failures: list[str] = []

    for name, eval_class in eval_classes:
        eval_instance: BaseAlmanacEvalGroup[Any, Any] | None = None
        try:
            eval_instance = eval_class()
            dataset = eval_instance.dataset()

            if case_filter:
                dataset.cases = [case for case in dataset.cases if case_filter in case.name]
                if not dataset.cases:
                    continue

            experiment_name = f"{dataset.name}-{git_sha}-{session_id}"
            report = dataset.evaluate_sync(
                eval_instance.task,
                name=experiment_name,
                max_concurrency=max_concurrency,
                progress=False,
                metadata={
                    "suite": eval_instance.suite_name,
                    "world": eval_instance.world_name,
                    "git_sha": git_sha,
                    "eval_group": name,
                },
            )
            results.append((experiment_name, report))
        except Exception as error:
            failures.append(f"{name}: {error}")
        finally:
            if eval_instance is not None:
                try:
                    eval_instance.teardown()
                except Exception as error:
                    failures.append(f"{name} teardown: {error}")

    return results, failures


def collect_eval_classes(path: Path) -> list[tuple[str, type[BaseAlmanacEvalGroup[Any, Any]]]]:
    repo_root = Path.cwd().resolve()
    files = [path] if path.is_file() else sorted(path.rglob("*.py"))
    eval_classes: list[tuple[str, type[BaseAlmanacEvalGroup[Any, Any]]]] = []
    skip_parts = {"__pycache__", "harness", "worlds"}

    for file in files:
        if file.name == "__init__.py" or any(part in skip_parts for part in file.parts):
            continue

        try:
            resolved = file.resolve()
            module_name = resolved.relative_to(repo_root).with_suffix("").as_posix().replace("/", ".")
            spec = util.spec_from_file_location(module_name, resolved)
            if spec is None or spec.loader is None:
                continue
            module = util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            for obj_name, obj in inspect.getmembers(module):
                if (
                    inspect.isclass(obj)
                    and issubclass(obj, BaseAlmanacEvalGroup)
                    and obj is not BaseAlmanacEvalGroup
                    and not inspect.isabstract(obj)
                ):
                    eval_classes.append((obj_name, obj))
        except Exception as error:
            print(f"Error importing {file}: {error}", file=sys.stderr)

    return eval_classes


def has_report_failures(results: list[tuple[str, EvaluationReport[Any, Any, Any]]]) -> bool:
    for _, report in results:
        if report.failures:
            return True
        for case in report.cases:
            for assertion in case.assertions.values():
                if not assertion.value:
                    return True
            if case.evaluator_failures:
                return True
    return False


def print_summary(
    results: list[tuple[str, EvaluationReport[Any, Any, Any]]],
    failures: list[str],
    *,
    verbose: bool,
) -> None:
    print("\n--- Almanac AI Eval Summary ---\n")
    for experiment_name, report in results:
        print(experiment_name)
        report.print(include_input=verbose, include_output=verbose, include_reasons=True)

    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f"- {failure}")
    elif not has_report_failures(results):
        print("\nAll evals passed.")


def print_json(results: list[tuple[str, EvaluationReport[Any, Any, Any]]], failures: list[str]) -> None:
    experiments: list[dict[str, Any]] = []
    for experiment_name, report in results:
        experiment: dict[str, Any] = {"name": experiment_name, "cases": []}
        for case in report.cases:
            experiment["cases"].append(
                {
                    "name": case.name,
                    "task_duration": round(case.task_duration, 3),
                    "assertions": {
                        name: {"value": result.value, "reason": result.reason}
                        for name, result in case.assertions.items()
                    },
                    "scores": {
                        name: {"value": result.value, "reason": result.reason}
                        for name, result in case.scores.items()
                    },
                    "labels": {
                        name: {"value": result.value, "reason": result.reason}
                        for name, result in case.labels.items()
                    },
                    "evaluator_failures": [
                        {"name": failure.name, "error": failure.error_message}
                        for failure in case.evaluator_failures
                    ],
                }
            )
        for failure in report.failures:
            experiment["cases"].append({"name": failure.name, "error": failure.error_message})
        averages = report.averages()
        if averages:
            experiment["averages"] = {
                "assertions_pass_rate": averages.assertions,
                "task_duration": round(averages.task_duration, 3),
                "scores": dict(averages.scores),
                "metrics": dict(averages.metrics),
            }
        experiments.append(experiment)

    signals = result_signals(results, failures)
    passed_cases = int(signals["case_count"]) - int(signals["failed_cases"])
    output: dict[str, Any] = {
        "summary": f"Almanac AI evals passed {passed_cases}/{signals['case_count']} cases.",
        "status": "completed" if signals["failed_cases"] == 0 else "failed",
        "signals": signals,
        "raw": {"experiments": experiments, "failures": failures},
    }
    print(json.dumps(output, indent=2, default=str))


def result_signals(
    results: list[tuple[str, EvaluationReport[Any, Any, Any]]],
    failures: list[str],
) -> dict[str, int | float]:
    case_count = 0
    failed_cases = 0
    assertion_count = 0
    passed_assertions = 0
    evaluator_failures = 0

    for _, report in results:
        failed_cases += len(report.failures)
        case_count += len(report.failures)
        for case in report.cases:
            case_count += 1
            case_failed = bool(case.evaluator_failures)
            evaluator_failures += len(case.evaluator_failures)
            for assertion in case.assertions.values():
                assertion_count += 1
                if assertion.value:
                    passed_assertions += 1
                else:
                    case_failed = True
            if case_failed:
                failed_cases += 1

    failed_cases += len(failures)
    case_count += len(failures)
    pass_rate = 1.0 if case_count == 0 else (case_count - failed_cases) / case_count
    assertion_pass_rate = 1.0 if assertion_count == 0 else passed_assertions / assertion_count
    return {
        "pass_rate": round(pass_rate, 4),
        "assertion_pass_rate": round(assertion_pass_rate, 4),
        "case_count": case_count,
        "failed_cases": failed_cases,
        "assertion_count": assertion_count,
        "evaluator_failures": evaluator_failures,
        "runner_failures": len(failures),
    }


def current_git_sha() -> str:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except OSError:
        return "nogit"
    return completed.stdout.strip() or "nogit"


if __name__ == "__main__":
    raise SystemExit(main())
