from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import SituToolDeps, BaseSituTool
from .models import AddMeasurementResult


class AddMeasurementTool(
    BaseSituTool[SituToolDeps, AddMeasurementResult]
):
    name = "add_measurement"
    result_type = AddMeasurementResult
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
    ) -> AddMeasurementResult:
        """Record one measurement under an evaluation.

        A measurement is one observed result for the evaluation's subject —
        a baseline run or a candidate experiment run. Pass the human-readable
        text in `result` and structured fields in `payload`. Metric payloads
        may use shorthand values, but are normalized to typed metric value
        objects shaped like `{"score": {"value": 0.73, "direction":
        "higher_is_better"}}`. Use `comparison_baseline_id` /
        `comparison_measurement_id` in the payload when comparing a candidate
        run to a specific baseline measurement.
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
            event_type="measurement.added",
            message=result,
            payload={
                "measurement_id": measurement.id,
                "evaluation_id": evaluation_id,
            },
        )
        await ctx.deps.publish_record(record=measurement, event=event)
        return AddMeasurementResult(
            success=True,
            measurement=measurement.model_dump(),
        )
