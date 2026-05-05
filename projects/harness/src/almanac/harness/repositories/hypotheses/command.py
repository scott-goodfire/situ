from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateHypothesis(RepositoryCommand):
    hypothesis_id: str
    objective_id: str
    title: str
    summary: str
    status: str = "open"
    associated_session_id: str | None = None


class UpdateHypothesis(RepositoryCommand):
    hypothesis_id: str
    title: str | None = None
    summary: str | None = None
    status: str | None = None
    associated_session_id: str | None = None
