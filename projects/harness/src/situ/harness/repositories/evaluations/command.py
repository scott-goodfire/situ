from __future__ import annotations

from pydantic import model_validator

from ...records import RecordStatus
from ..base.command import RepositoryCommand


class CreateEvaluation(RepositoryCommand):
    evaluation_id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    associated_baseline_id: str | None = None
    associated_experiment_id: str | None = None
    status: RecordStatus = RecordStatus.TRIAGE

    @model_validator(mode="after")
    def require_exactly_one_subject(self) -> "CreateEvaluation":
        has_baseline = self.associated_baseline_id is not None
        has_experiment = self.associated_experiment_id is not None
        if has_baseline == has_experiment:
            raise ValueError(
                "evaluation must have exactly one measured subject: "
                "associated_baseline_id or associated_experiment_id"
            )
        return self


class UpdateEvaluation(RepositoryCommand):
    evaluation_id: str
    title: str | None = None
    summary: str | None = None
    status: RecordStatus | None = None
    associated_baseline_id: str | None = None
    associated_experiment_id: str | None = None

    @model_validator(mode="after")
    def forbid_two_new_subjects(self) -> "UpdateEvaluation":
        if (
            self.associated_baseline_id is not None
            and self.associated_experiment_id is not None
        ):
            raise ValueError(
                "evaluation can be associated with either a baseline or an "
                "experiment, not both"
            )
        return self
