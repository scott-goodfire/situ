from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddHypothesisCommentResult


class AddHypothesisCommentTool(
    BaseSituTool[SituToolDeps, AddHypothesisCommentResult]
):
    name = "add_hypothesis_comment"
    result_type = AddHypothesisCommentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        hypothesis_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddHypothesisCommentResult:
        """Add a human-readable comment to a hypothesis activity trail."""
        activity = ctx.deps.get_repos().hypothesis_activities.add(
            hypothesis_id=hypothesis_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = ctx.deps.record_event(
            "hypothesis.comment_added",
            comment,
            payload={"activity_id": activity.id, "hypothesis_id": hypothesis_id},
        )
        ctx.deps.publish_record(activity, event=event)
        return AddHypothesisCommentResult(success=True, activity=activity.model_dump())
