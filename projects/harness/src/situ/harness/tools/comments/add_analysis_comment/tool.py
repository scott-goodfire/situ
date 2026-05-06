from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import AddAnalysisCommentResult


class AddAnalysisCommentTool(
    BaseSituTool[SituToolDeps, AddAnalysisCommentResult]
):
    name = "add_analysis_comment"
    result_type = AddAnalysisCommentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        analysis_id: str,
        comment: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddAnalysisCommentResult:
        """Add a human-readable comment to an analysis activity trail."""
        activity = ctx.deps.get_repos().analysis_activities.add(
            analysis_id=analysis_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="comment",
            body=comment,
            payload=payload or {},
        )
        event = ctx.deps.record_event(
            "analysis.comment_added",
            comment,
            payload={"activity_id": activity.id, "analysis_id": analysis_id},
        )
        ctx.deps.publish_record(activity, event=event)
        return AddAnalysisCommentResult(success=True, activity=activity.model_dump())
