from __future__ import annotations

from ..base import DbRecord


class ProjectConfigRecord(DbRecord):
    id: str
    repo_path: str
    evaluation_context: str
    known_signals: list[str]
    experiment_scope: str
    created_at: str
    updated_at: str
