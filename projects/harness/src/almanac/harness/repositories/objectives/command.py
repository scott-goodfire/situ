from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateObjective(RepositoryCommand):
    objective_id: str
    title: str
    description: str
    status: str = "active"
    associated_session_id: str | None = None


class UpdateObjective(RepositoryCommand):
    objective_id: str
    title: str | None = None
    description: str | None = None
    status: str | None = None
    associated_session_id: str | None = None
