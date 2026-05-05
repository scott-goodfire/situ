from __future__ import annotations

from ...records import WorkStatus
from ..base.command import RepositoryCommand


class CreateHypothesis(RepositoryCommand):
    hypothesis_id: str
    objective_id: str
    title: str
    summary: str
    status: WorkStatus = WorkStatus.OPEN
    associated_session_id: str | None = None


class UpdateHypothesis(RepositoryCommand):
    hypothesis_id: str
    title: str | None = None
    summary: str | None = None
    status: WorkStatus | None = None
    associated_session_id: str | None = None
