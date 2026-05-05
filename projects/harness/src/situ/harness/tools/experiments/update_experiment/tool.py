from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import SituToolDeps, BaseSituTool
from .models import UpdateExperimentResult


class UpdateExperimentTool(BaseSituTool[SituToolDeps, UpdateExperimentResult]):
    name = "update_experiment"
    result_type = UpdateExperimentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateExperimentResult:
        """Update simple experiment fields.

        `status` must be `open`, `active`, or `closed`. Put result details
        such as completed, failed, or suspicious in an experiment
        comment instead.
        """
        experiment = ctx.deps.get_repos().experiments.update(
            experiment_id=experiment_id,
            title=title,
            summary=summary,
            status=status,
        )
        if experiment is None:
            raise ValueError(f"experiment not found: {experiment_id}")

        event = ctx.deps.record_event(
            "experiment.updated",
            f"Updated experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        ctx.deps.publish_record(experiment, event=event)
        return UpdateExperimentResult(success=True, experiment=experiment.model_dump())
