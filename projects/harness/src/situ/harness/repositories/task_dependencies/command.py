from __future__ import annotations

from ..base.command import RepositoryCommand


class CreateTaskDependency(RepositoryCommand):
    project_id: str
    task_id: str
    blocked_by_task_id: str
