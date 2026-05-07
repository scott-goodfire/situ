from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import ProjectStatus, parse_project_status
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
        """Update a project by ID or the current project."""
        repos = ctx.deps.get_repos()
        resolved_project_id = project_id or ctx.deps.current_project_id()
        if resolved_project_id is None:
            raise ValueError("project_id is required when the current run has no project")
        if status is not None and parse_project_status(status) == ProjectStatus.CLOSED:
            return self._failure(
                code="project_close_requires_confirmation",
                message=(
                    "Project close must use the close handshake. Call "
                    "`request_project_close` first. It will return a "
                    "confirmation code and remind you to keep going unless no "
                    "useful next work exists. If you are still sure after that, "
                    "call `confirm_project_close` with the returned code."
                ),
            )
        project = repos.projects.update(
            project_id=resolved_project_id,
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
