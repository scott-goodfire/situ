from __future__ import annotations

from ...records import WorkStatus
from ..base.command import RepositoryCommand


class CreateHypothesis(RepositoryCommand):
    hypothesis_id: str
    session_id: str
    title: str
    summary: str
    status: WorkStatus = WorkStatus.OPEN


class UpdateHypothesis(RepositoryCommand):
    hypothesis_id: str
    title: str | None = None
    summary: str | None = None
    status: WorkStatus | None = None
