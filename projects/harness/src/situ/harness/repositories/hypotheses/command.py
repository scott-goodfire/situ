from __future__ import annotations

from ...records import RecordStatus
from ..base.command import RepositoryCommand


class CreateHypothesis(RepositoryCommand):
    hypothesis_id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    summary: str
    status: RecordStatus = RecordStatus.TRIAGE


class UpdateHypothesis(RepositoryCommand):
    hypothesis_id: str
    title: str | None = None
    summary: str | None = None
    status: RecordStatus | None = None
