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
from .models import AcceptExperimentResult


class AcceptExperimentTool(BaseSituTool[SituToolDeps, AcceptExperimentResult]):
    name = "accept_experiment"
    result_type = AcceptExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> AcceptExperimentResult:
        """Accept a triaged experiment (triage -> accepted).

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
        if experiment.status != RecordStatus.TRIAGE:
            return self._failure(
                code="invalid_status_transition",
                message=f"accept_experiment requires status 'triage', got '{experiment.status.value}'.",
            )
        updated = await repos.experiments.update(experiment_id=experiment_id, status=RecordStatus.ACCEPTED)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update experiment: {experiment_id}")
        await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from triage to accepted.",
            payload={"from_status": "triage", "to_status": "accepted"},
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
            event_type="experiment.accepted",
            message=f"Accepted experiment {experiment_id}",
            payload={"experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return AcceptExperimentResult(success=True, experiment=updated.model_dump())
