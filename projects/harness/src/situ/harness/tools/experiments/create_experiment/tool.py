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
        resolved_experiment_id = experiment_id or _next_experiment_id(
            repos=repos,
            project_id=project_id,
        )
        experiment = repos.experiments.create(
            experiment_id=resolved_experiment_id,
            project_id=project_id,
            created_in_session_id=session_id,
            title=title,
            summary=summary,
            status=status,
        )
        event = ctx.deps.record_event(
            "experiment.created",
            f"Created experiment {experiment.id}",
            payload={"experiment_id": experiment.id},
        )
        ctx.deps.publish_record(experiment, event=event)
        return CreateExperimentResult(success=True, experiment=experiment.model_dump())


def _next_experiment_id(
    *,
    repos: Any,
    project_id: str,
) -> str:
    count = len(repos.experiments.list_for_project(project_id)) + 1
    return f"exp_{project_id}_agent_{count:03d}"
