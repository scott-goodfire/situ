from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import ListEvaluationActivitiesResult


class ListEvaluationActivitiesTool(
    BaseSituTool[SituToolDeps, ListEvaluationActivitiesResult]
):
    name = "list_evaluation_activities"
    result_type = ListEvaluationActivitiesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str | None = None,
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> ListEvaluationActivitiesResult:
        """List evaluation activity by evaluation or project."""
        repos = ctx.deps.get_repos()
        if evaluation_id is not None:
            activities = repos.evaluation_activities.list_for_evaluation(
                evaluation_id=evaluation_id
            )
        else:
            resolved_project_id = project_id or ctx.deps.current_project_id()
            activities = (
                repos.evaluation_activities.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListEvaluationActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
