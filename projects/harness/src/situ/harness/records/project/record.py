from __future__ import annotations

from enum import StrEnum

from ..base import DbRecord


class ProjectStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"


def parse_project_status(status: ProjectStatus | str) -> ProjectStatus:
    try:
        return ProjectStatus(status)
    except ValueError as error:
        allowed = ", ".join(f"'{item.value}'" for item in ProjectStatus)
        raise ValueError(
            f"invalid project status: {status!r}. Use exactly one of {allowed}."
        ) from error


class ProjectRecord(DbRecord):
    id: str
    workspace_id: str
    title: str
    objective: str
    research_context: str
    status: ProjectStatus
    created_at: str
    updated_at: str
