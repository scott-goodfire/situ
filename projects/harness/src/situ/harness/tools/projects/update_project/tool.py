from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import ProjectStatus
from ...common import BaseSituTool, SituToolDeps
from .models import UpdateProjectResult


class UpdateProjectTool(BaseSituTool[SituToolDeps, UpdateProjectResult]):
    name = "update_project"
    result_type = UpdateProjectResult
    sequential = True

    def execute_sync(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        project_id: str | None = None,
        title: str | None = None,
        objective: str | None = None,
        research_context: str | None = None,
        status: ProjectStatus | None = None,
        **_kwargs: Any,
    ) -> UpdateProjectResult:
        """Update the project attached to the current session or a project by ID."""
        repos = ctx.deps.get_repos()
        resolved_project_id = project_id
        if resolved_project_id is None:
            session = repos.sessions.get(ctx.deps.session_id)
            resolved_project_id = session.project_id if session is not None else None
        if resolved_project_id is None:
            raise ValueError("project_id is required when the session has no project")
        project = repos.projects.update(
            resolved_project_id,
            title=title,
            objective=objective,
            research_context=research_context,
            status=status,
        )
        if project is None:
            raise ValueError(f"project not found: {resolved_project_id}")
        event = ctx.deps.record_event(
            "project.updated",
            f"Updated project {project.id}",
            payload={"project_id": project.id},
        )
        ctx.deps.publish_record(project, event=event)
        return UpdateProjectResult(success=True, project=project.model_dump())
