from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import TaskActivityKind, TaskActivityRecord
from ..base import BaseRepository
from .command import AddTaskActivity


def _task_activity_row(row: Any) -> TaskActivityRecord:
    return TaskActivityRecord(
        id=row["id"],
        project_id=row["project_id"],
        task_id=row["task_id"],
        created_in_session_id=row["created_in_session_id"],
        actor_agent_id=row["actor_agent_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class TaskActivitiesRepository(BaseRepository):
    async def add(
        self,
        *,
        project_id: str,
        task_id: str,
        actor: str,
        kind: TaskActivityKind | str,
        body: str,
        created_in_session_id: str | None = None,
        actor_agent_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> TaskActivityRecord:
        command = AddTaskActivity(
            project_id=project_id,
            task_id=task_id,
            created_in_session_id=created_in_session_id,
            actor_agent_id=actor_agent_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        cursor = await self.db.execute(
            """
            INSERT INTO task_activities
              (project_id, task_id, created_in_session_id, actor_agent_id, actor,
               kind, body, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.project_id,
                command.task_id,
                command.created_in_session_id,
                command.actor_agent_id,
                command.actor,
                command.kind,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = await self.get_by_id(activity_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("task activity was not persisted")
        return record

    async def get_by_id(self, *, activity_id: int) -> TaskActivityRecord | None:
        row = await self.db.fetchone("SELECT * FROM task_activities WHERE id = ?", (activity_id,))
        return _task_activity_row(row) if row else None

    async def get(self, *, activity_id: int) -> TaskActivityRecord | None:
        return await self.get_by_id(activity_id=activity_id)

    async def list_all(self) -> list[TaskActivityRecord]:
        return [
            _task_activity_row(row)
            for row in await self.db.fetchall("SELECT * FROM task_activities ORDER BY id")
        ]

    async def list_for_task(self, *, task_id: str) -> list[TaskActivityRecord]:
        return [
            _task_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM task_activities WHERE task_id = ? ORDER BY id",
                (task_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[TaskActivityRecord]:
        return [
            _task_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM task_activities WHERE project_id = ? ORDER BY id",
                (project_id,),
            )
        ]
