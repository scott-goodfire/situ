from __future__ import annotations

from typing import Literal

from ..base import DbRecord


WorkStatus = Literal["open", "active", "closed"]


class ExperimentRecord(DbRecord):
    id: str
    objective_id: str
    status: WorkStatus
    title: str
    summary: str
    associated_session_id: str | None = None
    created_at: str
    updated_at: str
