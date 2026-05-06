from __future__ import annotations

from ...records import WorkStatus
from ..base.command import RepositoryCommand


class CreateEvaluation(RepositoryCommand):
    evaluation_id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    associated_experiment_id: str | None = None
    status: WorkStatus = WorkStatus.OPEN


class UpdateEvaluation(RepositoryCommand):
    evaluation_id: str
    title: str | None = None
    summary: str | None = None
    status: WorkStatus | None = None
    associated_experiment_id: str | None = None
