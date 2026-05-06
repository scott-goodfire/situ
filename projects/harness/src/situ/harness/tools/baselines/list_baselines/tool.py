from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import BaseSituTool, SituToolDeps
from .models import ListBaselinesResult


class ListBaselinesTool(BaseSituTool[SituToolDeps, ListBaselinesResult]):
    name = "list_baselines"
    result_type = ListBaselinesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        session_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListBaselinesResult:
        """List baselines for a project, defaulting to the current session."""
        checked_status = (
            parse_work_status(status=status, noun="baseline")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        if project_id is not None:
            baselines = repos.baselines.list_for_project(project_id)
        else:
            baselines = repos.baselines.list_for_session(session_id or ctx.deps.session_id)

        if checked_status is not None:
            baselines = [
                baseline
                for baseline in baselines
                if baseline.status == checked_status
            ]

        return ListBaselinesResult(
            success=True,
            baselines=[baseline.model_dump() for baseline in baselines],
        )
