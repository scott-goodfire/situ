from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import ListHypothesisActivitiesResult


class ListHypothesisActivitiesTool(
    BaseSituTool[SituToolDeps, ListHypothesisActivitiesResult]
):
    name = "list_hypothesis_activities"
    result_type = ListHypothesisActivitiesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str | None = None,
        session_id: str | None = None,
        **_kwargs: Any,
    ) -> ListHypothesisActivitiesResult:
        """List hypothesis activity by hypothesis or session."""
        repos = ctx.deps.get_repos()
        if hypothesis_id is not None:
            activities = repos.hypothesis_activities.list_for_hypothesis(
                hypothesis_id
            )
        else:
            activities = repos.hypothesis_activities.list_for_session(
                session_id or ctx.deps.session_id
            )

        return ListHypothesisActivitiesResult(
            success=True,
            activities=[activity.model_dump() for activity in activities],
        )
