from __future__ import annotations

from ...records import TaskEntityKind
from ..base.command import RepositoryCommand


class CreateTaskEntityLink(RepositoryCommand):
    project_id: str
    task_id: str
    entity_kind: TaskEntityKind
    entity_id: str
    relationship: str
