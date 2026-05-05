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
        session_id: str | None = None,
        experiment_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListEvaluationsResult:
        """List evaluations by session or associated experiment."""
        checked_status = (
            parse_work_status(status=status, noun="evaluation")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        if experiment_id is not None:
            evaluations = repos.evaluations.list_for_experiment(experiment_id)
        else:
            evaluations = repos.evaluations.list_for_session(
                session_id or ctx.deps.session_id
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
