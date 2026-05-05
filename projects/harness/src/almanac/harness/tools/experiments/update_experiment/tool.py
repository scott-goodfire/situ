from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import UpdateExperimentResult


class UpdateExperimentTool(BaseAlmanacTool[AlmanacToolDeps, UpdateExperimentResult]):
    name = "update_experiment"
    result_type = UpdateExperimentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        experiment_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: str | None = None,
        **_kwargs: Any,
    ) -> UpdateExperimentResult:
        """Update simple experiment fields."""
        experiment = ctx.deps.repos.experiments.update(
            experiment_id,
            title=title,
            summary=summary,
            status=status,
        )
        if experiment is None:
            raise ValueError(f"experiment not found: {experiment_id}")

        ctx.deps.record_event(
            "experiment.updated",
            f"Updated experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        return UpdateExperimentResult(success=True, experiment=experiment.model_dump())
