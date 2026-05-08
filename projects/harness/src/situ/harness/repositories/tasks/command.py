from __future__ import annotations

from typing import Any

from pydantic import Field

from ...records import TaskKind, TaskPriority, TaskSourceKind, TaskStatus, TaskWorkType
from ..base.command import RepositoryCommand


class CreateTask(RepositoryCommand):
    task_id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    content: str
    kind: TaskKind
    work_type: TaskWorkType | None = None
    priority: TaskPriority = TaskPriority.NORMAL
    source_kind: TaskSourceKind = TaskSourceKind.SYSTEM
    parent_task_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    available_at: str | None = None


class UpdateTask(RepositoryCommand):
    task_id: str
    title: str | None = None
    content: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    source_kind: TaskSourceKind | None = None
    assignee_id: str | None = None
    parent_task_id: str | None = None
    payload: dict[str, Any] | None = None
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
    result_summary: str | None = None
    claimed_in_session_id: str | None = None
    completed_in_session_id: str | None = None
