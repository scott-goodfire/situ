from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from ....records import ProjectStatus
from ...common import BaseSituTool, SituToolDeps
from .models import CreateProjectResult


class CreateProjectTool(BaseSituTool[SituToolDeps, CreateProjectResult]):
    name = "create_project"
    result_type = CreateProjectResult
    sequential = True

    async def execute(
        self,
        *,
        ctx: RunContext[SituToolDeps],
        title: str,
        objective: str,
        research_context: str,
        project_id: str | None = None,
        attach_to_current_run: bool = True,
        **_kwargs: Any,
    ) -> CreateProjectResult:
        """Create a workspace project and optionally attach it to the current run."""
        repos = await ctx.deps.get_repos()
        workspace = await repos.workspaces.ensure()
        resolved_project_id = project_id or await repos.projects.next_id(workspace_id=workspace.id)
        project = await repos.projects.create(
            project_id=resolved_project_id,
            workspace_id=workspace.id,
            title=title,
            objective=objective,
            research_context=research_context,
            status=ProjectStatus.ACTIVE,
        )
        session = (
            await repos.sessions.update_project(
                session_id=ctx.deps.session_id,
                project_id=project.id,
            )
            if attach_to_current_run
            else None
        )
        event = await ctx.deps.record_event(
            event_type="project.created",
            message=f"Created project {project.id}",
            payload={"project_id": project.id, "workspace_id": workspace.id},
        )
        await ctx.deps.publish_record(record=project, event=event)
        if session is not None:
            await ctx.deps.publish_record(record=session, event=event)
        return CreateProjectResult(
            success=True,
            project=project.model_dump(),
            attached_to_current_run=session is not None,
        )
