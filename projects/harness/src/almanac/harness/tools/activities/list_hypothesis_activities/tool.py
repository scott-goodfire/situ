from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import ListHypothesisActivitiesResult


class ListHypothesisActivitiesTool(
    BaseAlmanacTool[AlmanacToolDeps, ListHypothesisActivitiesResult]
):
    name = "list_hypothesis_activities"
    result_type = ListHypothesisActivitiesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        hypothesis_id: str | None = None,
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> ListHypothesisActivitiesResult:
        """List hypothesis activity by hypothesis or session."""
        if hypothesis_id is not None:
            activities = ctx.deps.repos.hypothesis_activities.list_for_hypothesis(
                hypothesis_id
            )
        else:
            activities = ctx.deps.repos.hypothesis_activities.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListHypothesisActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
