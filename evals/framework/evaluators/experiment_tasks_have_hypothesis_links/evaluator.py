from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_evals.evaluators import EvaluationReason, Evaluator, EvaluatorContext


@dataclass
class ExperimentTasksHaveHypothesisLinks(Evaluator[Any, Any, Any]):
    def evaluate(
        self,
        ctx: EvaluatorContext[Any, Any, Any],
    ) -> EvaluationReason:
        graph = getattr(ctx.output, "project_overview", {})
        if not isinstance(graph, dict):
            return EvaluationReason(
                value=False,
                reason="Output did not expose a project_overview dict.",
            )

        tasks = graph.get("tasks", [])
        task_links = graph.get("task_entity_links", [])
        experiment_links = graph.get("hypothesis_experiment_links", [])
        experiment_tasks = [
            task
            for task in tasks
            if isinstance(task, dict) and task.get("kind") == "experiment"
        ]
        missing: list[str] = []
        for task in experiment_tasks:
            task_id = task.get("id")
            payload = (
                task.get("payload")
                if isinstance(task.get("payload"), dict)
                else {}
            )
            payload_hypothesis_ids = _string_set(payload.get("hypothesis_ids"))
            linked_hypothesis_ids = {
                str(link.get("entity_id"))
                for link in task_links
                if isinstance(link, dict)
                and link.get("task_id") == task_id
                and link.get("entity_kind") == "hypothesis"
            }
            produced_experiment_ids = {
                str(link.get("entity_id"))
                for link in task_links
                if isinstance(link, dict)
                and link.get("task_id") == task_id
                and link.get("entity_kind") == "experiment"
                and link.get("relationship") == "produces"
            }
            task_hypothesis_ids = payload_hypothesis_ids | linked_hypothesis_ids
            linked_experiment_hypothesis_ids = {
                str(link.get("hypothesis_id"))
                for link in experiment_links
                if isinstance(link, dict)
                and str(link.get("experiment_id")) in produced_experiment_ids
            }
            if not payload_hypothesis_ids:
                missing.append(f"{task_id}: missing payload.hypothesis_ids")
            if not linked_hypothesis_ids:
                missing.append(f"{task_id}: missing task hypothesis link")
            if produced_experiment_ids and not (
                task_hypothesis_ids & linked_experiment_hypothesis_ids
            ):
                missing.append(
                    f"{task_id}: produced experiment lacks matching hypothesis link"
                )

        if not missing:
            return EvaluationReason(
                value=True,
                reason=(
                    "All experiment tasks are hypothesis-backed "
                    f"({[task.get('id') for task in experiment_tasks]})."
                ),
            )
        return EvaluationReason(
            value=False,
            reason=(
                "Experiment tasks must carry hypothesis IDs, task links, and "
                f"matching produced experiment links. Missing: {missing}; "
                f"tasks: {experiment_tasks}; task_links: {task_links}; "
                f"hypothesis_experiment_links: {experiment_links}"
            ),
        )


def _string_set(value: Any) -> set[str]:
    if isinstance(value, str):
        values = [value]
    elif isinstance(value, list | tuple | set):
        values = list(value)
    else:
        values = []
    return {
        item.strip()
        for item in values
        if isinstance(item, str) and item.strip()
    }
