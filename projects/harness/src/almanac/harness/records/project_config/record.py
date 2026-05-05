from __future__ import annotations

from ..base import DbRecord


class ProjectConfigRecord(DbRecord):
    id: str
    repo_path: str
    research_context: str
    associated_session_id: str | None = None
    created_at: str
    updated_at: str
