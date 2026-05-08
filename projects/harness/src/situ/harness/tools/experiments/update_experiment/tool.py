from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import SituToolDeps, BaseSituTool
from .models import UpdateExperimentResult


class UpdateExperimentTool(BaseSituTool[SituToolDeps, UpdateExperimentResult]):
    name = "update_experiment"
    result_type = UpdateExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateExperimentResult:
        """Update simple experiment fields.

        Put result details such as completed, failed, or suspicious in an
        experiment comment instead.

        Notes:
            Use the dedicated transition tools for status changes rather
            than this update: `accept_experiment` (triage -> accepted),
            `submit_experiment` (active -> in_review), `complete_experiment`
            (in_review -> done), `cancel_experiment`, or `fail_experiment`.
            Each transition tool records a `status_updated` activity and
            accepts an optional verdict comment.
        """
        experiment = await (await ctx.deps.get_repos()).experiments.update(
            experiment_id=experiment_id,
            title=title,
            summary=summary,
            status=status,
        )
        if experiment is None:
            raise ValueError(f"experiment not found: {experiment_id}")

        event = await ctx.deps.record_event(
            event_type="experiment.updated",
            message=f"Updated experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        await ctx.deps.publish_record(record=experiment, event=event)
        return UpdateExperimentResult(success=True, experiment=experiment.model_dump())
