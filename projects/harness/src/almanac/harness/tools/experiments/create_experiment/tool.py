from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus
from ...common import AlmanacToolDeps, BaseAlmanacTool
from .models import CreateExperimentResult


class CreateExperimentTool(BaseAlmanacTool[AlmanacToolDeps, CreateExperimentResult]):
    name = "create_experiment"
    result_type = CreateExperimentResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[AlmanacToolDeps],
        title: str,
        summary: str,
        experiment_id: str | None = None,
        status: WorkStatus = WorkStatus.OPEN,
        **_kwargs: Any,
    ) -> CreateExperimentResult:
        """Create an experiment under the current session.

        `status` must be `open`, `active`, or `closed`.
        """
        repos = ctx.deps.get_repos()
        session_id = ctx.deps.session_id
        resolved_experiment_id = experiment_id or _next_experiment_id(
            repos=repos,
            session_id=session_id,
        )
        experiment = repos.experiments.create(
            experiment_id=resolved_experiment_id,
            session_id=session_id,
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
    session_id: str,
) -> str:
    count = len(repos.experiments.list_for_session(session_id)) + 1
    return f"exp_{session_id}_agent_{count:03d}"
