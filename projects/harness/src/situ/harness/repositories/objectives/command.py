from __future__ import annotations

from ...records import ObjectiveStatus
from ..base.command import RepositoryCommand


class CreateObjective(RepositoryCommand):
    objective_id: str
    session_id: str
    title: str
    description: str
    status: ObjectiveStatus = ObjectiveStatus.ACTIVE


class UpdateObjective(RepositoryCommand):
    objective_id: str
    title: str | None = None
    description: str | None = None
    status: ObjectiveStatus | None = None
