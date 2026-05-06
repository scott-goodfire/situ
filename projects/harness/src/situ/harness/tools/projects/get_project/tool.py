from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ...common import BaseSituTool, SituToolDeps
from .models import GetProjectResult


class GetProjectTool(BaseSituTool[SituToolDeps, GetProjectResult]):
    name = "get_project"
    result_type = GetProjectResult

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        **_kwargs: Any,
    ) -> GetProjectResult:
        """Read a project by ID or the project attached to the current session."""
        repos = ctx.deps.get_repos()
        resolved_project_id = project_id
        if resolved_project_id is None:
            session = repos.sessions.get(ctx.deps.session_id)
            resolved_project_id = session.project_id if session is not None else None
        project = (
            repos.projects.get(resolved_project_id)
            if resolved_project_id is not None
            else None
        )
        return GetProjectResult(
            success=True,
            project=project.model_dump() if project is not None else None,
        )
