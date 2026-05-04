from __future__ import annotations

import json
from typing import Any

from pydantic_evals.reporting import EvaluationReport

from evals.runner.signals import has_report_failures, result_signals


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
