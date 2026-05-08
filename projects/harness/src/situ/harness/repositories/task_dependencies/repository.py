from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import TaskDependencyRecord
from ..base import BaseRepository
from .command import CreateTaskDependency


def _task_dependency_row(row: Any) -> TaskDependencyRecord:
    return TaskDependencyRecord(
        project_id=row["project_id"],
        task_id=row["task_id"],
        blocked_by_task_id=row["blocked_by_task_id"],
        created_at=row["created_at"],
    )


class TaskDependenciesRepository(BaseRepository):
    def create(
        self,
        *,
        project_id: str,
        task_id: str,
        blocked_by_task_id: str,
    ) -> TaskDependencyRecord:
        command = CreateTaskDependency(
            project_id=project_id,
            task_id=task_id,
            blocked_by_task_id=blocked_by_task_id,
        )
        self.db.execute_blocking(
            """
            INSERT INTO task_dependencies
              (project_id, task_id, blocked_by_task_id, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(task_id, blocked_by_task_id) DO NOTHING
            """,
            (
                command.project_id,
                command.task_id,
                command.blocked_by_task_id,
                utc_now(),
            ),
        )
        record = self.get(
            task_id=command.task_id,
            blocked_by_task_id=command.blocked_by_task_id,
        )
        if record is None:
            raise RuntimeError(
                "task dependency was not persisted: "
                f"{command.task_id} blocked by {command.blocked_by_task_id}"
            )
        return record

    def get(
        self,
        *,
        task_id: str,
        blocked_by_task_id: str,
    ) -> TaskDependencyRecord | None:
        row = self.db.fetchone_blocking(
            """
            SELECT * FROM task_dependencies
            WHERE task_id = ? AND blocked_by_task_id = ?
            """,
            (task_id, blocked_by_task_id),
        )
        return _task_dependency_row(row) if row else None

    def list_all(self) -> list[TaskDependencyRecord]:
        return [
            _task_dependency_row(row)
            for row in self.db.fetchall_blocking(
                "SELECT * FROM task_dependencies ORDER BY created_at"
            )
        ]

    def list_for_task(self, *, task_id: str) -> list[TaskDependencyRecord]:
        return [
            _task_dependency_row(row)
            for row in self.db.fetchall_blocking(
                """
                SELECT * FROM task_dependencies
                WHERE task_id = ?
                ORDER BY created_at
                """,
                (task_id,),
            )
        ]

    def list_for_project(self, *, project_id: str) -> list[TaskDependencyRecord]:
        return [
            _task_dependency_row(row)
            for row in self.db.fetchall_blocking(
                """
                SELECT * FROM task_dependencies
                WHERE project_id = ?
                ORDER BY created_at
                """,
                (project_id,),
            )
        ]
