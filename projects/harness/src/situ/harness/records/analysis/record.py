from __future__ import annotations

from ..base import DbRecord
from ..experiment.record import WorkStatus


class AnalysisRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    created_by_agent_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    content: str
    supersedes_analysis_id: str | None = None
    created_at: str
    updated_at: str
