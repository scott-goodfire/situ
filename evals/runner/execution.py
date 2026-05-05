from __future__ import annotations

from typing import Any
from uuid import uuid4

from pydantic_evals.reporting import EvaluationReport

from evals.harness import BaseAlmanacEvalGroup
from evals.runner.git import current_git_sha
from evals.runner.retries import build_retry_config


def run_evals(
    eval_classes: list[tuple[str, type[BaseAlmanacEvalGroup[Any, Any]]]],
    *,
    case_filter: str | None,
    max_concurrency: int,
    task_retries: int,
    evaluator_retries: int,
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
                retry_task=build_retry_config(task_retries),
                retry_evaluators=build_retry_config(evaluator_retries),
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
