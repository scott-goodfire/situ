from __future__ import annotations

from ..base import DbRecord


class TaskDependencyRecord(DbRecord):
    project_id: str
    task_id: str
    blocked_by_task_id: str
    created_at: str
