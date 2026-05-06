from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddExperimentCommentResult


class AddExperimentCommentTool(
    BaseSituTool[SituToolDeps, AddExperimentCommentResult]
):
    name = "add_experiment_comment"
    result_type = AddExperimentCommentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddExperimentCommentResult:
        """Add a human-readable comment to an experiment activity trail."""
        activity = ctx.deps.get_repos().experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = ctx.deps.record_event(
            "experiment.comment_added",
            comment,
            payload={"activity_id": activity.id, "experiment_id": experiment_id},
        )
        ctx.deps.publish_record(activity, event=event)
        return AddExperimentCommentResult(success=True, activity=activity.model_dump())
