from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import ListEvaluationActivitiesResult


class ListEvaluationActivitiesTool(
    BaseAlmanacTool[AlmanacToolDeps, ListEvaluationActivitiesResult]
):
    name = "list_evaluation_activities"
    result_type = ListEvaluationActivitiesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        evaluation_id: str | None = None,
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> ListEvaluationActivitiesResult:
        """List evaluation activity by evaluation or session."""
        repos = ctx.deps.get_repos()
        if evaluation_id is not None:
            activities = repos.evaluation_activities.list_for_evaluation(
                evaluation_id
            )
        else:
            activities = repos.evaluation_activities.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListEvaluationActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
