from __future__ import annotations

import asyncio
from typing import Any

from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import ArtifactRecord
from ..base import BaseRepository
from .command import CreateArtifact

ARTIFACT_ID_PREFIX = RECORD_ID_PREFIXES["artifact"]
ARTIFACT_ID_ALLOCATION_LOCK = asyncio.Lock()


def _artifact_row(row: Any) -> ArtifactRecord:
    return ArtifactRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        associated_entity_kind=row["associated_entity_kind"],
        associated_entity_id=row["associated_entity_id"],
        kind=row["kind"],
        title=row["title"],
        path=row["path"],
        media_type=row["media_type"],
        size_bytes=row["size_bytes"],
        created_at=row["created_at"],
    )


class ArtifactsRepository(BaseRepository):
    async def create(
        self,
        *,
        artifact_id: str,
        project_id: str,
        kind: str,
        title: str,
        path: str,
        associated_entity_kind: str,
        associated_entity_id: str,
        created_in_session_id: str | None = None,
        media_type: str | None = None,
        size_bytes: int | None = None,
    ) -> ArtifactRecord:
        ensure_canonical_record_id(
            record_id=artifact_id,
            prefix=ARTIFACT_ID_PREFIX,
            noun="artifact",
        )
        command = CreateArtifact(
            artifact_id=artifact_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            kind=kind,
            title=title,
            path=path,
            associated_entity_kind=associated_entity_kind,
            associated_entity_id=associated_entity_id,
            media_type=media_type,
            size_bytes=size_bytes,
        )
        await self.db.execute(
            """
            INSERT INTO artifacts
              (id, project_id, created_in_session_id, associated_entity_kind,
               associated_entity_id, kind, title, path, media_type, size_bytes,
               created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.artifact_id,
                command.project_id,
                command.created_in_session_id,
                command.associated_entity_kind,
                command.associated_entity_id,
                command.kind,
                command.title,
                command.path,
                command.media_type,
                command.size_bytes,
                utc_now(),
            ),
        )
        record = await self.get_by_id(artifact_id=command.artifact_id)
        if record is None:
            raise RuntimeError(f"artifact was not persisted: {command.artifact_id}")
        return record

    async def get_by_id(self, *, artifact_id: str) -> ArtifactRecord | None:
        row = await self.db.fetchone("SELECT * FROM artifacts WHERE id = ?", (artifact_id,))
        return _artifact_row(row) if row else None

    async def get(self, *, artifact_id: str) -> ArtifactRecord | None:
        return await self.get_by_id(artifact_id=artifact_id)

    async def list_all(self) -> list[ArtifactRecord]:
        return [
            _artifact_row(row)
            for row in await self.db.fetchall("SELECT * FROM artifacts ORDER BY created_at")
        ]

    async def list_for_experiment(self, *, experiment_id: str) -> list[ArtifactRecord]:
        return [
            _artifact_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM artifacts
                WHERE associated_entity_kind = 'experiment'
                  AND associated_entity_id = ?
                ORDER BY created_at
                """,
                (experiment_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[ArtifactRecord]:
        return [
            _artifact_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM artifacts WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[ArtifactRecord]:
        session = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    async def latest_command_receipt_for_task(
        self,
        *,
        task_id: str,
    ) -> ArtifactRecord | None:
        row = await self.db.fetchone(
            """
            SELECT artifacts.*
            FROM artifacts
            JOIN task_entity_links links
              ON links.entity_kind = 'artifact'
             AND links.entity_id = artifacts.id
             AND links.relationship = 'receipt'
            WHERE links.task_id = ?
              AND artifacts.kind = 'command_receipt'
            ORDER BY artifacts.created_at DESC
            LIMIT 1
            """,
            (task_id,),
        )
        return _artifact_row(row) if row else None

    async def next_id(self, *, project_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM artifacts")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=ARTIFACT_ID_PREFIX,
        )
