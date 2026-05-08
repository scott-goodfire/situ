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

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str,
        result: str,
        actor: str = "agent",
        payload: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> AddEvaluationResult:
        """Record one measurement under an evaluation.

        Metric payloads may use shorthand values, but are normalized to typed
        metric value objects.
        """
        result_payload = {
            "activity_type": "result",
            "measurement_type": "result",
            **(payload or {}),
        }
        repos = await ctx.deps.get_repos()
        measurement = await repos.measurements.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            body=result,
            payload=result_payload,
        )
        event = await ctx.deps.record_event(
            event_type="evaluation.result_added",
            message=result,
            payload={
                "measurement_id": measurement.id,
                "evaluation_id": evaluation_id,
            },
        )
        await ctx.deps.publish_record(record=measurement, event=event)
        return AddEvaluationResult(
            success=True,
            measurement=measurement.model_dump(),
        )
