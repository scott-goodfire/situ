from __future__ import annotations

from ..base import DbRecord
from ..experiment.record import WorkStatus


class EvaluationRecord(DbRecord):
    id: str
    objective_id: str
    status: WorkStatus
    title: str
    summary: str
    associated_session_id: str | None = None
    associated_experiment_id: str | None = None
    created_at: str
    updated_at: str
