from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    canonical_record_id_number,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import (
    TaskKind,
    TaskPriority,
    TaskRecord,
    TaskSourceKind,
    TaskStatus,
    TaskWorkType,
    ensure_work_type_compatible_with_kind,
    parse_task_kind,
    parse_task_priority,
    parse_task_source_kind,
    parse_task_status,
    parse_task_work_type,
)
from ..base import BaseRepository
from .command import CreateTask, UpdateTask

TASK_ID_PREFIX = RECORD_ID_PREFIXES["task"]

PRIORITY_ORDER_SQL = """
CASE priority
  WHEN 'urgent' THEN 0
  WHEN 'high' THEN 1
  WHEN 'normal' THEN 2
  WHEN 'low' THEN 3
  ELSE 4
END
"""


def _task_row(row: Any) -> TaskRecord:
    return TaskRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        title=row["title"],
        content=row["content"],
        kind=row["kind"],
        work_type=row["work_type"] if row["work_type"] is not None else None,
        status=row["status"],
        priority=row["priority"],
        source_kind=row["source_kind"],
        assignee_id=row["assignee_id"],
        parent_task_id=row["parent_task_id"],
        payload=json_loads(row["payload_json"]),
        pydantic_run_id=row["pydantic_run_id"],
        conversation_id=row["conversation_id"],
        result_summary=row["result_summary"],
        created_at=row["created_at"],
        available_at=row["available_at"],
        claimed_in_session_id=row["claimed_in_session_id"],
        claimed_at=row["claimed_at"],
        completed_in_session_id=row["completed_in_session_id"],
        completed_at=row["completed_at"],
        updated_at=row["updated_at"],
    )


class TasksRepository(BaseRepository):
    async def create(
        self,
        *,
        task_id: str,
        project_id: str,
        created_in_session_id: str | None = None,
        title: str,
        content: str,
        kind: TaskKind | str,
        work_type: TaskWorkType | str | None = None,
        priority: TaskPriority | str = TaskPriority.NORMAL,
        source_kind: TaskSourceKind | str = TaskSourceKind.SYSTEM,
        parent_task_id: str | None = None,
        payload: dict[str, Any] | None = None,
        available_at: str | None = None,
    ) -> TaskRecord:
        ensure_canonical_record_id(
            record_id=task_id,
            prefix=TASK_ID_PREFIX,
            noun="task",
        )
        parsed_kind = parse_task_kind(kind)
        parsed_work_type = parse_task_work_type(work_type) if work_type is not None else None
        ensure_work_type_compatible_with_kind(kind=parsed_kind, work_type=parsed_work_type)
        command = CreateTask(
            task_id=task_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            title=title,
            content=content,
            kind=parsed_kind,
            work_type=parsed_work_type,
            priority=parse_task_priority(priority),
            source_kind=parse_task_source_kind(source_kind),
            parent_task_id=parent_task_id,
            payload=payload or {},
            available_at=available_at,
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO tasks
              (id, project_id, created_in_session_id, title, content, kind, work_type,
               status, priority, source_kind,
               assignee_id, parent_task_id, payload_json, pydantic_run_id,
               conversation_id, result_summary, created_at, available_at,
               claimed_in_session_id, claimed_at, completed_in_session_id,
               completed_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, ?, NULL, NULL, NULL, NULL, ?)
            """,
            (
                command.task_id,
                command.project_id,
                command.created_in_session_id,
                command.title,
                command.content,
                command.kind.value,
                command.work_type.value if command.work_type is not None else None,
                TaskStatus.BACKLOG.value,
                command.priority.value,
                command.source_kind.value,
                command.parent_task_id,
                json_dumps(command.payload),
                now,
                command.available_at or now,
                now,
            ),
        )
        record = await self.get(task_id=command.task_id)
        if record is None:
            raise RuntimeError(f"task was not persisted: {command.task_id}")
        return record

    async def update(
        self,
        *,
        task_id: str,
        title: str | None = None,
        content: str | None = None,
        status: TaskStatus | str | None = None,
        priority: TaskPriority | str | None = None,
        source_kind: TaskSourceKind | str | None = None,
        assignee_id: str | None = None,
        parent_task_id: str | None = None,
        payload: dict[str, Any] | None = None,
        pydantic_run_id: str | None = None,
        conversation_id: str | None = None,
        result_summary: str | None = None,
        claimed_in_session_id: str | None = None,
        completed_in_session_id: str | None = None,
    ) -> TaskRecord | None:
        current = await self.get(task_id=task_id)
        if current is None:
            return None
        checked_status = parse_task_status(status) if status is not None else None
        command = UpdateTask(
            task_id=task_id,
            title=title,
            content=content,
            status=checked_status,
            priority=parse_task_priority(priority) if priority is not None else None,
            source_kind=(
                parse_task_source_kind(source_kind) if source_kind is not None else None
            ),
            assignee_id=assignee_id,
            parent_task_id=parent_task_id,
            payload=payload,
            pydantic_run_id=pydantic_run_id,
            conversation_id=conversation_id,
            result_summary=result_summary,
            claimed_in_session_id=claimed_in_session_id,
            completed_in_session_id=completed_in_session_id,
        )
        now = utc_now()
        completed_at = current.completed_at
        resolved_completed_in_session_id = current.completed_in_session_id
        if checked_status in {TaskStatus.DONE, TaskStatus.ABANDONED, TaskStatus.FAILED}:
            completed_at = completed_at or now
            resolved_completed_in_session_id = (
                resolved_completed_in_session_id or command.completed_in_session_id
            )
        elif checked_status in {TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS}:
            completed_at = None
            resolved_completed_in_session_id = None
        await self.db.execute(
            """
            UPDATE tasks
            SET title = ?,
                content = ?,
                status = ?,
                priority = ?,
                source_kind = ?,
                assignee_id = ?,
                parent_task_id = ?,
                payload_json = ?,
                pydantic_run_id = ?,
                conversation_id = ?,
                result_summary = ?,
                claimed_in_session_id = ?,
                completed_in_session_id = ?,
                completed_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.content if command.content is not None else current.content,
                command.status.value if command.status is not None else current.status.value,
                command.priority.value if command.priority is not None else current.priority.value,
                (
                    command.source_kind.value
                    if command.source_kind is not None
                    else current.source_kind.value
                ),
                command.assignee_id if command.assignee_id is not None else current.assignee_id,
                (
                    command.parent_task_id
                    if command.parent_task_id is not None
                    else current.parent_task_id
                ),
                json_dumps(command.payload if command.payload is not None else current.payload),
                (
                    command.pydantic_run_id
                    if command.pydantic_run_id is not None
                    else current.pydantic_run_id
                ),
                (
                    command.conversation_id
                    if command.conversation_id is not None
                    else current.conversation_id
                ),
                (
                    command.result_summary
                    if command.result_summary is not None
                    else current.result_summary
                ),
                (
                    command.claimed_in_session_id
                    if command.claimed_in_session_id is not None
                    else current.claimed_in_session_id
                ),
                resolved_completed_in_session_id,
                completed_at,
                now,
                command.task_id,
            ),
        )
        return await self.get(task_id=command.task_id)

    async def requeue(
        self,
        *,
        task_id: str,
        title: str | None = None,
        content: str | None = None,
        priority: TaskPriority | str | None = None,
        source_kind: TaskSourceKind | str | None = None,
        payload: dict[str, Any] | None = None,
        available_at: str | None = None,
    ) -> TaskRecord | None:
        current = await self.get(task_id=task_id)
        if current is None:
            return None
        now = utc_now()
        await self.db.execute(
            """
            UPDATE tasks
            SET title = ?,
                content = ?,
                status = ?,
                priority = ?,
                source_kind = ?,
                assignee_id = NULL,
                payload_json = ?,
                pydantic_run_id = NULL,
                conversation_id = NULL,
                result_summary = NULL,
                available_at = ?,
                claimed_in_session_id = NULL,
                claimed_at = NULL,
                completed_in_session_id = NULL,
                completed_at = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (
                title if title is not None else current.title,
                content if content is not None else current.content,
                TaskStatus.BACKLOG.value,
                (
                    parse_task_priority(priority).value
                    if priority is not None
                    else current.priority.value
                ),
                (
                    parse_task_source_kind(source_kind).value
                    if source_kind is not None
                    else current.source_kind.value
                ),
                json_dumps(payload if payload is not None else current.payload),
                available_at or now,
                now,
                task_id,
            ),
        )
        return await self.get(task_id=task_id)

    async def claim(
        self,
        *,
        task_id: str,
        agent_id: str,
        eligible_kinds: Sequence[TaskKind | str],
        claimed_in_session_id: str | None = None,
    ) -> TaskRecord | None:
        kinds = [parse_task_kind(kind).value for kind in eligible_kinds]
        if not kinds:
            return None
        now = utc_now()
        placeholders = ", ".join("?" for _ in kinds)
        cursor = await self.db.execute(
            f"""
            UPDATE tasks
            SET status = ?,
                assignee_id = ?,
                claimed_in_session_id = ?,
                claimed_at = ?,
                updated_at = ?
            WHERE id = ?
              AND status = ?
              AND available_at <= ?
              AND kind IN ({placeholders})
              AND NOT EXISTS (
                SELECT 1
                FROM task_dependencies dependency
                JOIN tasks blocker ON blocker.id = dependency.blocked_by_task_id
                WHERE dependency.task_id = tasks.id
                  AND blocker.status != ?
              )
            """,
            (
                TaskStatus.IN_PROGRESS.value,
                agent_id,
                claimed_in_session_id,
                now,
                now,
                task_id,
                TaskStatus.BACKLOG.value,
                now,
                *kinds,
                TaskStatus.DONE.value,
            ),
        )
        return await self.get(task_id=task_id) if cursor.rowcount == 1 else None

    async def claim_next(
        self,
        *,
        project_id: str,
        agent_id: str,
        eligible_kinds: Sequence[TaskKind | str],
        claimed_in_session_id: str | None = None,
    ) -> TaskRecord | None:
        kinds = [parse_task_kind(kind).value for kind in eligible_kinds]
        if not kinds:
            return None
        placeholders = ", ".join("?" for _ in kinds)
        now = utc_now()
        rows = await self.db.fetchall(
            f"""
            SELECT * FROM tasks
            WHERE project_id = ?
              AND status = ?
              AND available_at <= ?
              AND kind IN ({placeholders})
              AND NOT EXISTS (
                SELECT 1
                FROM task_dependencies dependency
                JOIN tasks blocker ON blocker.id = dependency.blocked_by_task_id
                WHERE dependency.task_id = tasks.id
                  AND blocker.status != ?
              )
            ORDER BY {PRIORITY_ORDER_SQL}, created_at
            """,
            (project_id, TaskStatus.BACKLOG.value, now, *kinds, TaskStatus.DONE.value),
        )
        for row in rows:
            claimed = await self.claim(
                task_id=row["id"],
                agent_id=agent_id,
                eligible_kinds=kinds,
                claimed_in_session_id=claimed_in_session_id,
            )
            if claimed is not None:
                return claimed
        return None

    async def list_runnable_for_project(
        self,
        *,
        project_id: str,
        eligible_kinds: Sequence[TaskKind | str],
    ) -> list[TaskRecord]:
        kinds = [parse_task_kind(kind).value for kind in eligible_kinds]
        if not kinds:
            return []
        placeholders = ", ".join("?" for _ in kinds)
        now = utc_now()
        rows = await self.db.fetchall(
            f"""
            SELECT * FROM tasks
            WHERE project_id = ?
              AND status = ?
              AND available_at <= ?
              AND kind IN ({placeholders})
              AND NOT EXISTS (
                SELECT 1
                FROM task_dependencies dependency
                JOIN tasks blocker ON blocker.id = dependency.blocked_by_task_id
                WHERE dependency.task_id = tasks.id
                  AND blocker.status != ?
              )
            ORDER BY {PRIORITY_ORDER_SQL}, created_at
            """,
            (project_id, TaskStatus.BACKLOG.value, now, *kinds, TaskStatus.DONE.value),
        )
        return [_task_row(row) for row in rows]

    async def get(self, *, task_id: str) -> TaskRecord | None:
        row = await self.db.fetchone("SELECT * FROM tasks WHERE id = ?", (task_id,))
        return _task_row(row) if row else None

    async def list_all(self) -> list[TaskRecord]:
        return [
            _task_row(row)
            for row in await self.db.fetchall(
                f"SELECT * FROM tasks ORDER BY {PRIORITY_ORDER_SQL}, created_at"
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[TaskRecord]:
        return [
            _task_row(row)
            for row in await self.db.fetchall(
                f"""
                SELECT * FROM tasks
                WHERE project_id = ?
                ORDER BY {PRIORITY_ORDER_SQL}, created_at
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[TaskRecord]:
        project_id = await self._project_id_for_session(session_id)
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    async def next_id(self, *, project_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM tasks")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=TASK_ID_PREFIX,
        )

    async def _project_id_for_session(self, session_id: str) -> str | None:
        row = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        return row["project_id"] if row else None


def canonical_task_id_number(task_id: str) -> int | None:
    return canonical_record_id_number(record_id=task_id, prefix=TASK_ID_PREFIX)
