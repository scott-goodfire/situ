from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import HypothesisRecord, WorkStatus, parse_work_status
from ..base import BaseRepository
from .command import CreateHypothesis, UpdateHypothesis

HYPOTHESIS_ID_PREFIX = RECORD_ID_PREFIXES["hypothesis"]


def _hypothesis_row(row: Any) -> HypothesisRecord:
    return HypothesisRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        title=row["title"],
        summary=row["summary"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class HypothesesRepository(BaseRepository):
    async def create(
        self,
        *,
        hypothesis_id: str,
        project_id: str,
        title: str,
        summary: str,
        created_in_session_id: str | None = None,
        status: WorkStatus | str = WorkStatus.OPEN,
    ) -> HypothesisRecord:
        ensure_canonical_record_id(
            record_id=hypothesis_id,
            prefix=HYPOTHESIS_ID_PREFIX,
            noun="hypothesis",
        )
        checked_status = parse_work_status(status=status, noun="hypothesis")
        command = CreateHypothesis(
            hypothesis_id=hypothesis_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO hypotheses
              (id, project_id, created_in_session_id, title, summary, status,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.hypothesis_id,
                command.project_id,
                command.created_in_session_id,
                command.title,
                command.summary,
                command.status.value,
                now,
                now,
            ),
        )
        record = await self.get_by_id(hypothesis_id=command.hypothesis_id)
        if record is None:
            raise RuntimeError(f"hypothesis was not persisted: {command.hypothesis_id}")
        return record

    async def update(
        self,
        *,
        hypothesis_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: WorkStatus | str | None = None,
    ) -> HypothesisRecord | None:
        checked_status = (
            parse_work_status(status=status, noun="hypothesis")
            if status is not None
            else None
        )
        command = UpdateHypothesis(
            hypothesis_id=hypothesis_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        current = await self.get_by_id(hypothesis_id=command.hypothesis_id)
        if current is None:
            return None
        await self.db.execute(
            """
            UPDATE hypotheses
            SET title = ?, summary = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                utc_now(),
                command.hypothesis_id,
            ),
        )
        return await self.get_by_id(hypothesis_id=command.hypothesis_id)

    async def get_by_id(self, *, hypothesis_id: str) -> HypothesisRecord | None:
        row = await self.db.fetchone("SELECT * FROM hypotheses WHERE id = ?", (hypothesis_id,))
        return _hypothesis_row(row) if row else None

    async def get(self, *, hypothesis_id: str) -> HypothesisRecord | None:
        return await self.get_by_id(hypothesis_id=hypothesis_id)

    async def list_all(self) -> list[HypothesisRecord]:
        return [
            _hypothesis_row(row)
            for row in await self.db.fetchall("SELECT * FROM hypotheses ORDER BY created_at")
        ]

    async def list_for_project(self, *, project_id: str) -> list[HypothesisRecord]:
        return [
            _hypothesis_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM hypotheses
                WHERE project_id = ?
                ORDER BY created_at
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[HypothesisRecord]:
        session = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    async def next_id(self, *, project_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM hypotheses")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=HYPOTHESIS_ID_PREFIX,
        )
