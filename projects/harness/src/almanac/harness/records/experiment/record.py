from __future__ import annotations

from ..base import DbRecord


class ExperimentRecord(DbRecord):
    id: str
    run_id: str
    status: str
    intent: str
    change_summary: str
    components: list[str]
    based_on: list[str]
    suspicious: bool = False
    suspicious_reason: str | None = None
    note: str = ""
    created_at: str
    updated_at: str
