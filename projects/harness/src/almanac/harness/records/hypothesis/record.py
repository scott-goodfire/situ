from __future__ import annotations

from ..base import DbRecord
from ..experiment.record import WorkStatus


class HypothesisRecord(DbRecord):
    id: str
    objective_id: str
    title: str
    summary: str
    status: WorkStatus
    created_at: str
    updated_at: str
