from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateExperiment(RepositoryCommand):
    experiment_id: str
    objective_id: str
    title: str
    summary: str
    created_in_session_id: str | None = None
    status: str = "open"


class UpdateExperiment(RepositoryCommand):
    experiment_id: str
    title: str | None = None
    summary: str | None = None
    status: str | None = None
