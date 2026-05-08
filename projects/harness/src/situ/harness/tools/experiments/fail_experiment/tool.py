from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import FailExperimentResult

_FAILABLE = {RecordStatus.ACTIVE, RecordStatus.IN_REVIEW}


class FailExperimentTool(BaseSituTool[SituToolDeps, FailExperimentResult]):
    name = "fail_experiment"
    result_type = FailExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> FailExperimentResult:
        """Mark an active or in-review experiment as failed (active|in_review -> failed).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        experiment = await repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return self._failure(code="experiment_not_found", message=f"experiment not found: {experiment_id}")
        if experiment.status not in _FAILABLE:
            return self._failure(
                code="invalid_status_transition",
                message=f"fail_experiment requires status 'active' or 'in_review', got '{experiment.status.value}'.",
            )
        from_status = experiment.status.value
        updated = await repos.experiments.update(experiment_id=experiment_id, status=RecordStatus.FAILED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update experiment: {experiment_id}")
        await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body=f"Status changed from {from_status} to failed.",
            payload={"from_status": from_status, "to_status": "failed"},
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
            event_type="experiment.failed",
            message=f"Failed experiment {experiment_id}",
            payload={"experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return FailExperimentResult(success=True, experiment=updated.model_dump())
