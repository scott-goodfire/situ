from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import WorkStatus, parse_work_status
from ...common import BaseSituTool, SituToolDeps
from .models import ListAnalysesResult


class ListAnalysesTool(BaseSituTool[SituToolDeps, ListAnalysesResult]):
    name = "list_analyses"
    result_type = ListAnalysesResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        session_id: str | None = None,
        status: WorkStatus | None = None,
        **_kwargs: Any,
    ) -> ListAnalysesResult:
        """List analyses by project or status."""
        checked_status = (
            parse_work_status(status=status, noun="analysis")
            if status is not None
            else None
        )
        repos = ctx.deps.get_repos()
        if project_id is not None:
            analyses = repos.analyses.list_for_project(project_id)
        else:
            analyses = repos.analyses.list_for_session(session_id or ctx.deps.session_id)

        if checked_status is not None:
            analyses = [
                analysis for analysis in analyses if analysis.status == checked_status
            ]

        return ListAnalysesResult(
            success=True,
            analyses=[analysis.model_dump() for analysis in analyses],
        )
