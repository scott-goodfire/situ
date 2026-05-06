from __future__ import annotations

from ..base import DbRecord
from ..experiment.record import WorkStatus


class HypothesisRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: WorkStatus
    created_at: str
    updated_at: str
