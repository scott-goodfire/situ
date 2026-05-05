from __future__ import annotations

from ...records import WorkStatus
from ..base.command import RepositoryCommand


class CreateEvaluation(RepositoryCommand):
    evaluation_id: str
    objective_id: str
    title: str
    summary: str
    associated_session_id: str | None = None
    associated_experiment_id: str | None = None
    status: WorkStatus = WorkStatus.OPEN


class UpdateEvaluation(RepositoryCommand):
    evaluation_id: str
    title: str | None = None
    summary: str | None = None
    status: WorkStatus | None = None
    associated_session_id: str | None = None
    associated_experiment_id: str | None = None
