from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import SituToolDeps, BaseSituTool
from .models import ListEvaluationsResult


class ListEvaluationsTool(BaseSituTool[SituToolDeps, ListEvaluationsResult]):
    name = "list_evaluations"
    result_type = ListEvaluationsResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        baseline_id: str | None = None,
        experiment_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListEvaluationsResult:
        """List evaluations by project, associated baseline, or experiment."""
        checked_status = (
            parse_work_status(status=status, noun="evaluation")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        if baseline_id is not None:
            evaluations = repos.evaluations.list_for_baseline(baseline_id)
        elif experiment_id is not None:
            evaluations = repos.evaluations.list_for_experiment(experiment_id)
        else:
            resolved_project_id = project_id or ctx.deps.current_project_id()
            evaluations = (
                repos.evaluations.list_for_project(resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        if checked_status is not None:
            evaluations = [
                evaluation
                for evaluation in evaluations
                if evaluation.status == checked_status
            ]

        return ListEvaluationsResult(
            success=True,
            evaluations=[evaluation.model_dump() for evaluation in evaluations],
        )
