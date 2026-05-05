from __future__ import annotations

from ..base import DbRecord


class WarningRecord(DbRecord):
    id: int
    run_id: str
    experiment_id: str | None = None
    kind: str
    message: str
    created_at: str
