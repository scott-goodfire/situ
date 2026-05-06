from __future__ import annotations

from ..base import DbRecord


class WorkspaceRecord(DbRecord):
    id: str
    repo_path: str
    created_at: str
    updated_at: str
