from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetMeasurementResult


class GetMeasurementTool(BaseSituTool[SituToolDeps, GetMeasurementResult]):
    name = "get_measurement"
    result_type = GetMeasurementResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        measurement_id: str,
        **_kwargs: Any,
    ) -> GetMeasurementResult:
        """Read a measurement record by id."""
        repos = await ctx.deps.get_repos()
        measurement = await repos.measurements.get(measurement_id=measurement_id)
        if measurement is None:
            return self._failure(
                code="measurement_not_found",
                message=f"Measurement '{measurement_id}' was not found.",
            )
        return GetMeasurementResult(
            success=True,
            measurement=measurement.model_dump(),
        )
