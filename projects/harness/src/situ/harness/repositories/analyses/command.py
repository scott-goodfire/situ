from __future__ import annotations

from ...records import WorkStatus
from ..base.command import RepositoryCommand


class CreateAnalysis(RepositoryCommand):
    analysis_id: str
    project_id: str
    created_in_session_id: str | None = None
    created_by_agent_id: str | None = None
    status: WorkStatus = WorkStatus.OPEN
    title: str
    summary: str
    content: str
    supersedes_analysis_id: str | None = None


class UpdateAnalysis(RepositoryCommand):
    analysis_id: str
    status: WorkStatus | None = None
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    supersedes_analysis_id: str | None = None
