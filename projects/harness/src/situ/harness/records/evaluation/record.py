from __future__ import annotations

from pydantic import model_validator

from ..base import DbRecord
from ..experiment.record import WorkStatus


class EvaluationRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    status: WorkStatus
    title: str
    summary: str
    associated_baseline_id: str | None = None
    associated_experiment_id: str | None = None
    created_at: str
    updated_at: str

    @model_validator(mode="after")
    def require_exactly_one_subject(self) -> "EvaluationRecord":
        has_baseline = self.associated_baseline_id is not None
        has_experiment = self.associated_experiment_id is not None
        if has_baseline == has_experiment:
            raise ValueError(
                "evaluation must have exactly one measured subject: "
                "associated_baseline_id or associated_experiment_id"
            )
        return self
