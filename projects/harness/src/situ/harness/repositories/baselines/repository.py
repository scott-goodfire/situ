from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import utc_now
from ...core.ids import (
    RECORD_ID_PREFIXES,
    ensure_canonical_record_id,
    next_canonical_record_id,
)
from ...records import BaselineRecord, RecordStatus, parse_record_status
from ..base import BaseRepository
from .command import CreateBaseline, UpdateBaseline

BASELINE_ID_PREFIX = RECORD_ID_PREFIXES["baseline"]


def _baseline_row(row: Any) -> BaselineRecord:
    return BaselineRecord(
        id=row["id"],
        project_id=row["project_id"],
        created_in_session_id=row["created_in_session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class BaselinesRepository(BaseRepository):
    async def create(
        self,
        *,
        baseline_id: str,
        project_id: str,
        title: str,
        summary: str,
        created_in_session_id: str | None = None,
        status: RecordStatus | str = RecordStatus.TRIAGE,
    ) -> BaselineRecord:
        ensure_canonical_record_id(
            record_id=baseline_id,
            prefix=BASELINE_ID_PREFIX,
            noun="baseline",
        )
        checked_status = parse_record_status(status=status, noun="baseline")
        command = CreateBaseline(
            baseline_id=baseline_id,
            project_id=project_id,
            created_in_session_id=created_in_session_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        now = utc_now()
        await self.db.execute(
            """
            INSERT INTO baselines
              (id, project_id, created_in_session_id, status, title, summary,
               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.baseline_id,
                command.project_id,
                command.created_in_session_id,
                command.status.value,
                command.title,
                command.summary,
                now,
                now,
            ),
        )
        record = await self.get_by_id(baseline_id=command.baseline_id)
        if record is None:
            raise RuntimeError(f"baseline was not persisted: {command.baseline_id}")
        return record

    async def update(
        self,
        *,
        baseline_id: str,
        title: str | None = None,
        summary: str | None = None,
        status: RecordStatus | str | None = None,
    ) -> BaselineRecord | None:
        checked_status = (
            parse_record_status(status=status, noun="baseline")
            if status is not None
            else None
        )
        command = UpdateBaseline(
            baseline_id=baseline_id,
            title=title,
            summary=summary,
            status=checked_status,
        )
        current = await self.get_by_id(baseline_id=command.baseline_id)
        if current is None:
            return None

        await self.db.execute(
            """
            UPDATE baselines
            SET title = ?, summary = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                command.title if command.title is not None else current.title,
                command.summary if command.summary is not None else current.summary,
                command.status.value if command.status is not None else current.status.value,
                utc_now(),
                command.baseline_id,
            ),
        )
        return await self.get_by_id(baseline_id=command.baseline_id)

    async def get_by_id(self, *, baseline_id: str) -> BaselineRecord | None:
        row = await self.db.fetchone("SELECT * FROM baselines WHERE id = ?", (baseline_id,))
        return _baseline_row(row) if row else None

    async def get(self, *, baseline_id: str) -> BaselineRecord | None:
        return await self.get_by_id(baseline_id=baseline_id)

    async def list_all(self) -> list[BaselineRecord]:
        return [
            _baseline_row(row)
            for row in await self.db.fetchall("SELECT * FROM baselines ORDER BY created_at")
        ]

    async def list_for_project(self, *, project_id: str) -> list[BaselineRecord]:
        return [
            _baseline_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM baselines WHERE project_id = ? ORDER BY created_at",
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[BaselineRecord]:
        session = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )

    async def search(
        self,
        *,
        project_id: str,
        query: str,
        limit: int = 20,
        status: RecordStatus | str | None = None,
    ) -> list[tuple[BaselineRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        where = ["baselines_fts MATCH ?", "baselines_fts.project_id = ?"]
        params: list[Any] = [normalized, project_id]
        if status is not None:
            where.append("baselines.status = ?")
            params.append(parse_record_status(status=status, noun="baseline").value)
        params.append(limit)
        sql = f"""
            SELECT baselines.*,
                   snippet(baselines_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM baselines_fts
            JOIN baselines ON baselines.id = baselines_fts.baseline_id
            WHERE {" AND ".join(where)}
            ORDER BY bm25(baselines_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, tuple(params))
        return [(_baseline_row(row), row["_snippet"]) for row in rows]

    async def next_id(self, *, project_id: str) -> str:
        rows = await self.db.fetchall("SELECT id FROM baselines")
        return next_canonical_record_id(
            existing_ids=(str(row["id"]) for row in rows),
            prefix=BASELINE_ID_PREFIX,
        )
