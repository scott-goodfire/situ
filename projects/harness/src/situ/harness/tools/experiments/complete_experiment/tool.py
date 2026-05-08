from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import (
    BaseSituTool,
    ReviewTargetKind,
    SituToolDeps,
    ensure_active_review_target,
)
from .models import CompleteExperimentResult


class CompleteExperimentTool(BaseSituTool[SituToolDeps, CompleteExperimentResult]):
    name = "complete_experiment"
    result_type = CompleteExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CompleteExperimentResult:
        """Mark an in-review experiment as done (in_review -> done).

        Records a `status_updated` activity and optionally a `comment`.
        """
        ensure_active_review_target(
            ctx=ctx,
            kind=ReviewTargetKind.EXPERIMENT,
            record_id=experiment_id,
        )
        repos = await ctx.deps.get_repos()
        experiment = await repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return self._failure(code="experiment_not_found", message=f"experiment not found: {experiment_id}")
        if experiment.status != RecordStatus.IN_REVIEW:
            return self._failure(
                code="invalid_status_transition",
                message=f"complete_experiment requires status 'in_review', got '{experiment.status.value}'.",
            )
        updated = await repos.experiments.update(experiment_id=experiment_id, status=RecordStatus.DONE)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update experiment: {experiment_id}")
        await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from in_review to done.",
            payload={"from_status": "in_review", "to_status": "done"},
        )
        if comment:
            await repos.experiment_activities.add(
                experiment_id=experiment_id,
                created_in_session_id=ctx.deps.session_id,
                actor="agent",
                kind="comment",
                body=comment,
            )
        event = await ctx.deps.record_event(
            event_type="experiment.done",
            message=f"Completed experiment {experiment_id}",
            payload={"experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CompleteExperimentResult(success=True, experiment=updated.model_dump())
