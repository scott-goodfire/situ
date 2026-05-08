from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import ProjectRecord, ProjectStatus, parse_project_status
from ..base import BaseRepository
from .command import CreateProject, UpdateProject

PROJECT_ID_PREFIX = RECORD_ID_PREFIXES["project"]


def _project_row(row: Any) -> ProjectRecord:
    return ProjectRecord(
        id=row["id"],
        workspace_id=row["workspace_id"],
        title=row["title"],
        objective=row["objective"],
        research_context=row["research_context"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class ProjectRepository(BaseRepository):
    async def create(
        self,
        *,
        project_id: str,
        workspace_id: str,
        title: str,
        objective: str,
        research_context: str,
        status: ProjectStatus | str = ProjectStatus.ACTIVE,
    ) -> ProjectRecord:
        ensure_canonical_record_id(
            record_id=project_id,
            prefix=PROJECT_ID_PREFIX,
            noun="project",
        )
        command = CreateProject(
            project_id=project_id,
            workspace_id=workspace_id,
            title=title,
            objective=objective,
            research_context=research_context,
            status=parse_project_status(status),
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO projects
              (id, workspace_id, title, objective, research_context, status,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.project_id,
                command.workspace_id,
                command.title,
                command.objective,
                command.research_context,
                command.status.value,
                now,
                now,
            ),
        )
        record = await self.get(project_id=command.project_id)
        if record is None:
            raise RuntimeError(f"project was not persisted: {command.project_id}")
        return record

    async def update(
        self,
        *,
        project_id: str,
        title: str | None = None,
        objective: str | None = None,
        research_context: str | None = None,
        status: ProjectStatus | str | None = None,
    ) -> ProjectRecord | None:
        current = await self.get(project_id=project_id)
        if current is None:
            return None
        command = UpdateProject(
            project_id=project_id,
            title=title,
            objective=objective,
            research_context=research_context,
            status=parse_project_status(status) if status is not None else None,
        )
        now = utc_now()
        await self.db.execute(
            """
            UPDATE projects
            SET title = ?,
                objective = ?,
                research_context = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.objective if command.objective is not None else current.objective,
                (
                    command.research_context
                    if command.research_context is not None
                    else current.research_context
                ),
                command.status.value if command.status is not None else current.status.value,
                now,
                command.project_id,
            ),
        )
        return await self.get(project_id=command.project_id)

    async def get(self, *, project_id: str) -> ProjectRecord | None:
        row = await self.db.fetchone("SELECT * FROM projects WHERE id = ?", (project_id,))
        return _project_row(row) if row else None

    async def list_all(self) -> list[ProjectRecord]:
        return [
            _project_row(row)
            for row in await self.db.fetchall("SELECT * FROM projects ORDER BY created_at")
        ]

    async def list_for_workspace(self, *, workspace_id: str) -> list[ProjectRecord]:
        return [
            _project_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at",
                (workspace_id,),
            )
        ]

    async def next_id(self, *, workspace_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM projects")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=PROJECT_ID_PREFIX,
        )
