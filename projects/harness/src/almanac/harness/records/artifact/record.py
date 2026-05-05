from __future__ import annotations

from ..base import DbRecord


class ArtifactRecord(DbRecord):
    id: str
    objective_id: str
    session_id: str | None = None
    hypothesis_id: str | None = None
    experiment_id: str | None = None
    hypothesis_activity_id: int | None = None
    experiment_activity_id: int | None = None
    kind: str
    title: str
    path: str
    media_type: str | None = None
    size_bytes: int | None = None
    created_at: str
