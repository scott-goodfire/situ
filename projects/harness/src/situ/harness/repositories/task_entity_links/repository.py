from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import (
    TaskEntityKind,
    TaskEntityLinkRecord,
    parse_task_entity_kind,
)
from ..base import BaseRepository
from .command import CreateTaskEntityLink


def _task_entity_link_row(row: Any) -> TaskEntityLinkRecord:
    return TaskEntityLinkRecord(
        project_id=row["project_id"],
        task_id=row["task_id"],
        entity_kind=row["entity_kind"],
        entity_id=row["entity_id"],
        relationship=row["relationship"],
        created_at=row["created_at"],
    )


class TaskEntityLinksRepository(BaseRepository):
    def create(
        self,
        *,
        project_id: str,
        task_id: str,
        entity_kind: TaskEntityKind | str,
        entity_id: str,
        relationship: str,
    ) -> TaskEntityLinkRecord:
        command = CreateTaskEntityLink(
            project_id=project_id,
            task_id=task_id,
            entity_kind=parse_task_entity_kind(entity_kind),
            entity_id=entity_id,
            relationship=relationship,
        )
        self.db.execute(
            """
            INSERT INTO task_entity_links
              (project_id, task_id, entity_kind, entity_id, relationship, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_id, entity_kind, entity_id, relationship) DO NOTHING
            """,
            (
                command.project_id,
                command.task_id,
                command.entity_kind.value,
                command.entity_id,
                command.relationship,
                utc_now(),
            ),
        )
        record = self.get(
            command.task_id,
            command.entity_kind,
            command.entity_id,
            command.relationship,
        )
        if record is None:
            raise RuntimeError(f"task entity link was not persisted: {command.task_id}")
        return record

    def get(
        self,
        task_id: str,
        entity_kind: TaskEntityKind | str,
        entity_id: str,
        relationship: str,
    ) -> TaskEntityLinkRecord | None:
        checked_kind = parse_task_entity_kind(entity_kind)
        row = self.db.fetchone(
            """
            SELECT * FROM task_entity_links
            WHERE task_id = ? AND entity_kind = ? AND entity_id = ? AND relationship = ?
            """,
            (task_id, checked_kind.value, entity_id, relationship),
        )
        return _task_entity_link_row(row) if row else None

    def list_all(self) -> list[TaskEntityLinkRecord]:
        return [
            _task_entity_link_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM task_entity_links ORDER BY created_at"
            )
        ]

    def list_for_task(self, task_id: str) -> list[TaskEntityLinkRecord]:
        return [
            _task_entity_link_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM task_entity_links
                WHERE task_id = ?
                ORDER BY created_at
                """,
                (task_id,),
            )
        ]

    def list_for_project(self, project_id: str) -> list[TaskEntityLinkRecord]:
        return [
            _task_entity_link_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM task_entity_links
                WHERE project_id = ?
                ORDER BY created_at
                """,
                (project_id,),
            )
        ]

    def list_for_entity(
        self,
        *,
        entity_kind: TaskEntityKind | str,
        entity_id: str,
    ) -> list[TaskEntityLinkRecord]:
        checked_kind = parse_task_entity_kind(entity_kind)
        return [
            _task_entity_link_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM task_entity_links
                WHERE entity_kind = ? AND entity_id = ?
                ORDER BY created_at
                """,
                (checked_kind.value, entity_id),
            )
        ]
