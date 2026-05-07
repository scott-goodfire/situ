from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import SituToolDeps, BaseSituTool
from .models import CreateExperimentResult


class CreateExperimentTool(BaseSituTool[SituToolDeps, CreateExperimentResult]):
    name = "create_experiment"
    result_type = CreateExperimentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        summary: str,
        experiment_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateExperimentResult:
        """Create an experiment under the current project.

        `status` must be `open`, `active`, or `closed`.
        """
        repos = ctx.deps.get_repos()
        project_id = ctx.deps.require_project_id()
        session_id = ctx.deps.session_id
        resolved_experiment_id = (
            experiment_id
            or ctx.deps.active_experiment_id
            or repos.experiments.next_id(project_id=project_id)
        )
        existing = repos.experiments.get(experiment_id=resolved_experiment_id)
        if existing is not None and experiment_id is None:
            next_status = (
                existing.status
                if existing.status == WorkStatus.ACTIVE and status == WorkStatus.OPEN
                else status
            )
            experiment = (
                repos.experiments.update(
                    experiment_id=resolved_experiment_id,
                    title=title,
                    summary=summary,
                    status=next_status,
                )
                or existing
            )
            event = ctx.deps.record_event(
                event_type="experiment.updated",
                message=f"Updated experiment {experiment.id}",
                payload={"experiment_id": experiment.id},
            )
            ctx.deps.publish_record(record=experiment, event=event)
            return CreateExperimentResult(
                success=True,
                experiment=experiment.model_dump(),
            )

        if existing is not None:
            raise ValueError(f"experiment already exists: {resolved_experiment_id}")

        experiment = repos.experiments.create(
            experiment_id=resolved_experiment_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=status,
        )
        event = ctx.deps.record_event(
            event_type="experiment.created",
            message=f"Created experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        ctx.deps.publish_record(record=experiment, event=event)
        return CreateExperimentResult(success=True, experiment=experiment.model_dump())
