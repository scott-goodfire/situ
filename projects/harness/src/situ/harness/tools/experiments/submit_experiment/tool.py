from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus
from ...common import BaseSituTool, SituToolDeps
from .models import SubmitExperimentResult


class SubmitExperimentTool(BaseSituTool[SituToolDeps, SubmitExperimentResult]):
    name = "submit_experiment"
    result_type = SubmitExperimentResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        experiment_id: str,
        comment: str | None = None,
        **_kwargs: Any,
    ) -> SubmitExperimentResult:
        """Submit a finished experiment for Critic review (active -> in_review).

        Records a `status_updated` activity and optionally a `comment`.
        """
        repos = await ctx.deps.get_repos()
        experiment = await repos.experiments.get(experiment_id=experiment_id)
        if experiment is None:
            return self._failure(code="experiment_not_found", message=f"experiment not found: {experiment_id}")
        if experiment.status != RecordStatus.ACTIVE:
            return self._failure(
                code="invalid_status_transition",
                message=f"submit_experiment requires status 'active', got '{experiment.status.value}'.",
            )
        updated = await repos.experiments.update(experiment_id=experiment_id, status=RecordStatus.IN_REVIEW)
        if updated is None:
            return self._failure(code="update_failed", message=f"failed to update experiment: {experiment_id}")
        await repos.experiment_activities.add(
            experiment_id=experiment_id,
            created_in_session_id=ctx.deps.session_id,
            actor="agent",
            kind="status_updated",
            body="Status changed from active to in_review.",
            payload={"from_status": "active", "to_status": "in_review"},
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
            event_type="experiment.in_review",
            message=f"Submitted experiment {experiment_id} for review",
            payload={"experiment_id": experiment_id},
        )
        await ctx.deps.publish_record(record=updated, event=event)
        return SubmitExperimentResult(success=True, experiment=updated.model_dump())
