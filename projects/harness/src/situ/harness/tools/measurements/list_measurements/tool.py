from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import ListMeasurementsResult


class ListMeasurementsTool(BaseSituTool[SituToolDeps, ListMeasurementsResult]):
    name = "list_measurements"
    result_type = ListMeasurementsResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        evaluation_id: str | None = None,
        baseline_id: str | None = None,
        experiment_id: str | None = None,
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> ListMeasurementsResult:
        """List measurements by evaluation, baseline, experiment, or project."""
        repos = ctx.deps.get_repos()
        if evaluation_id is not None:
            measurements = repos.measurements.list_for_evaluation(evaluation_id=evaluation_id)
        elif baseline_id is not None:
            measurements = repos.measurements.list_for_baseline(baseline_id=baseline_id)
        elif experiment_id is not None:
            measurements = repos.measurements.list_for_experiment(experiment_id=experiment_id)
        else:
            resolved_project_id = project_id or ctx.deps.current_project_id()
            measurements = (
                repos.measurements.list_for_project(project_id=resolved_project_id)
                if resolved_project_id is not None
                else []
            )

        return ListMeasurementsResult(
            success=True,
            measurements=[measurement.model_dump() for measurement in measurements],
        )
