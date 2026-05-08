from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import RecordStatus, parse_record_status
from ...common import SituToolDeps, BaseSituTool
from .models import ListExperimentsResult


class ListExperimentsTool(BaseSituTool[SituToolDeps, ListExperimentsResult]):
    name = "list_experiments"
    result_type = ListExperimentsResult

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        status: RecordStatus | None = None,
        **_kwargs: Any,
    ) -> ListExperimentsResult:
        """List experiments in the current project."""
        checked_status = (
            parse_record_status(status=status, noun="experiment")
            if status is not None
            else None
        )
        repos = await ctx.deps.get_repos()
        resolved_project_id = await ctx.deps.current_project_id()
        experiments = (
            await repos.experiments.list_for_project(project_id=resolved_project_id)
            if resolved_project_id is not None
            else []
        )

        if checked_status is not None:
            experiments = [
                experiment
                for experiment in experiments
                if experiment.status == checked_status
            ]

        return ListExperimentsResult(
            success=True,
            experiments=[experiment.model_dump() for experiment in experiments],
        )
