from __future__ import annotations

from typing import Any

from pydantic_evals.reporting import EvaluationReport


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
