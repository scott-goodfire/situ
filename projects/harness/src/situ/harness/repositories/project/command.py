from __future__ import annotations

from ...records import ProjectStatus
from ..base.command import RepositoryCommand


class CreateProject(RepositoryCommand):
    project_id: str
    workspace_id: str
    title: str
    objective: str
    research_context: str
    status: ProjectStatus = ProjectStatus.ACTIVE


class UpdateProject(RepositoryCommand):
    project_id: str
    title: str | None = None
    objective: str | None = None
    research_context: str | None = None
    status: ProjectStatus | None = None
