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
        """Record one measurement under an evaluation.

        The tool name is kept for existing agents, but the durable evidence
        record is a measurement. A legacy evaluation activity is also written
        while existing UI surfaces still read that trail. Metric payloads may
        use shorthand values, but are normalized to typed metric value objects.
        """
        result_payload = {
            "activity_type": "result",
            "measurement_type": "result",
            **(payload or {}),
        }
        repos = ctx.deps.get_repos()
        measurement = repos.measurements.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            body=result,
            payload=result_payload,
        )
        activity = repos.evaluation_activities.add(
            evaluation_id=evaluation_id,
            created_in_session_id=ctx.deps.session_id,
            actor=actor,
            kind="result",
            body=result,
            payload={**result_payload, "measurement_id": measurement.id},
        )
        event = ctx.deps.record_event(
            "evaluation.result_added",
            result,
            payload={
                "measurement_id": measurement.id,
                "activity_id": activity.id,
                "evaluation_id": evaluation_id,
            },
        )
        ctx.deps.publish_record(measurement, event=event)
        ctx.deps.publish_record(activity, event=event)
        return AddEvaluationResult(
            success=True,
            measurement=measurement.model_dump(),
            activity=activity.model_dump(),
        )
