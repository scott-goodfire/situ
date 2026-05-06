from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddEvaluationResult


class AddEvaluationResultTool(
    BaseSituTool[SituToolDeps, AddEvaluationResult]
):
    name = "add_evaluation_result"
    result_type = AddEvaluationResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        result: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddEvaluationResult:
        """Add human-readable result evidence to an evaluation activity trail."""
        result_payload = {"activity_type": "result", **(payload or {})}
        activity = ctx.deps.get_repos().evaluation_activities.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="result",
            body=result,
            payload=result_payload,
        )
        event = ctx.deps.record_event(
            "evaluation.result_added",
            result,
            payload={"activity_id": activity.id, "evaluation_id": evaluation_id},
        )
        ctx.deps.publish_record(activity, event=event)
        return AddEvaluationResult(success=True, activity=activity.model_dump())
