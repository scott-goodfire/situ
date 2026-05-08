from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import Field

from ..base import DbRecord


class TaskKind(StrEnum):
    PLAN = "plan"
    RESEARCH = "research"
    BASELINE = "baseline"
    HYPOTHESIZE = "hypothesize"
    EXPERIMENT = "experiment"
    INTERPRET = "interpret"
    REVIEW = "review"


class TaskWorkType(StrEnum):
    REVIEW_HYPOTHESIS = "review_hypothesis"
    REVIEW_EXPERIMENT = "review_experiment"


class TaskStatus(StrEnum):
    BACKLOG = "backlog"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    ABANDONED = "abandoned"
    FAILED = "failed"


class TaskPriority(StrEnum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class TaskSourceKind(StrEnum):
    MANAGER = "manager"
    USER = "user"
    SYSTEM = "system"


def parse_task_kind(kind: TaskKind | str) -> TaskKind:
    try:
        return TaskKind(kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in TaskKind)
        raise ValueError(f"invalid task kind: {kind!r}. Use exactly one of {allowed}.") from error


def parse_task_work_type(work_type: TaskWorkType | str) -> TaskWorkType:
    try:
        return TaskWorkType(work_type)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in TaskWorkType)
        raise ValueError(
            f"invalid task work type: {work_type!r}. Use exactly one of {allowed}."
        ) from error


REVIEW_WORK_TYPES = frozenset({TaskWorkType.REVIEW_HYPOTHESIS, TaskWorkType.REVIEW_EXPERIMENT})


def ensure_work_type_matches_kind(
    *, kind: TaskKind, work_type: TaskWorkType | None
) -> None:
    if work_type is None:
        return
    if work_type in REVIEW_WORK_TYPES and kind != TaskKind.REVIEW:
        raise ValueError(
            f"work_type {work_type.value!r} requires kind 'review', got {kind.value!r}."
        )


def parse_task_status(status: TaskStatus | str) -> TaskStatus:
    try:
        return TaskStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in TaskStatus)
        raise ValueError(
            f"invalid task status: {status!r}. Use exactly one of {allowed}."
        ) from error


def parse_task_priority(priority: TaskPriority | str) -> TaskPriority:
    try:
        return TaskPriority(priority)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in TaskPriority)
        raise ValueError(
            f"invalid task priority: {priority!r}. Use exactly one of {allowed}."
        ) from error


def parse_task_source_kind(source_kind: TaskSourceKind | str) -> TaskSourceKind:
    try:
        return TaskSourceKind(source_kind)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in TaskSourceKind)
        raise ValueError(
            f"invalid task source kind: {source_kind!r}. Use exactly one of {allowed}."
        ) from error


class TaskRecord(DbRecord):
    id: str
    project_id: str
    created_in_session_id: str | None = None
    title: str
    content: str
    kind: TaskKind
    work_type: TaskWorkType | None = None
    status: TaskStatus
    priority: TaskPriority
    source_kind: TaskSourceKind
    assignee_id: str | None = None
    parent_task_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    pydantic_run_id: str | None = None
    conversation_id: str | None = None
    result_summary: str | None = None
    created_at: str
    available_at: str
    claimed_in_session_id: str | None = None
    claimed_at: str | None = None
    completed_in_session_id: str | None = None
    completed_at: str | None = None
    updated_at: str
