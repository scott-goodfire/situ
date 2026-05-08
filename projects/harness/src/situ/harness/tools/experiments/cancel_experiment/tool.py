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
from .models import CancelExperimentResult

_TERMINAL = {RecordStatus.DONE, RecordStatus.CANCELED, RecordStatus.FAILED}


class CancelExperimentTool(BaseSituTool[SituToolDeps, CancelExperimentResult]):
    name = "cancel_experiment"
    result_type = CancelExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> CancelExperimentResult:
        """Cancel a non-terminal experiment (any non-terminal -> canceled).

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
        if experiment.status in _TERMINAL:
            return self._failure(
                code="invalid_status_transition",
                message=f"cancel_experiment cannot cancel an experiment already in terminal status '{experiment.status.value}'.",
            )
        from_status = experiment.status.value
        updated = await repos.experiments.update(experiment_id=experiment_id, status=RecordStatus.CANCELED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update experiment: {experiment_id}")
        await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to canceled.",
            payload={"from_status": from_status, "to_status": "canceled"},
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
            event_type="experiment.canceled",
            message=f"Canceled experiment {experiment_id}",
            payload={"experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return CancelExperimentResult(success=True, experiment=updated.model_dump())
