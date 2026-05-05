from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateHypothesis(RepositoryCommand):
    hypothesis_id: str
    objective_id: str
    title: str
    summary: str
    status: str = "open"


class UpdateHypothesis(RepositoryCommand):
    hypothesis_id: str
    title: str | None = None
    summary: str | None = None
    status: str | None = None
