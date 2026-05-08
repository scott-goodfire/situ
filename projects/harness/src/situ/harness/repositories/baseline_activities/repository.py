from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import (
    BaselineActivityKind,
    BaselineActivityRecord,
    parse_baseline_activity_kind,
)
from ..base import BaseRepository
from .command import AddBaselineActivity


def _baseline_activity_row(row: Any) -> BaselineActivityRecord:
    return BaselineActivityRecord(
        id=row["id"],
        baseline_id=row["baseline_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class BaselineActivitiesRepository(BaseRepository):
    async def add(
        self,
        *,
        baseline_id: str,
        actor: str,
        kind: BaselineActivityKind | str = BaselineActivityKind.CREATED,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> BaselineActivityRecord:
        command = AddBaselineActivity(
            baseline_id=baseline_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            kind=parse_baseline_activity_kind(kind),
            body=body,
            payload=payload or {},
        )
        cursor = await self.db.execute(
            """
            INSERT INTO baseline_activities
              (baseline_id, created_in_session_id, actor, kind, body, payload_json,
               created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.baseline_id,
                command.created_in_session_id,
                command.actor,
                command.kind.value,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = await self.get_by_id(activity_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("baseline activity was not persisted")
        return record

    async def get_by_id(self, *, activity_id: int) -> BaselineActivityRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM baseline_activities WHERE id = ?",
            (activity_id,),
        )
        return _baseline_activity_row(row) if row else None

    async def get(self, *, activity_id: int) -> BaselineActivityRecord | None:
        return await self.get_by_id(activity_id=activity_id)

    async def list_all(self) -> list[BaselineActivityRecord]:
        return [
            _baseline_activity_row(row)
            for row in await self.db.fetchall("SELECT * FROM baseline_activities ORDER BY id")
        ]

    async def list_for_baseline(self, *, baseline_id: str) -> list[BaselineActivityRecord]:
        return [
            _baseline_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM baseline_activities WHERE baseline_id = ? ORDER BY id",
                (baseline_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[BaselineActivityRecord]:
        return [
            _baseline_activity_row(row)
            for row in await self.db.fetchall(
                """
                SELECT baseline_activities.*
                FROM baseline_activities
                JOIN baselines ON baselines.id = baseline_activities.baseline_id
                WHERE baselines.project_id = ?
                ORDER BY baseline_activities.id
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[BaselineActivityRecord]:
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
    ) -> list[tuple[BaselineActivityRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        sql = """
            SELECT baseline_activities.*,
                   snippet(baseline_activities_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM baseline_activities_fts
            JOIN baseline_activities
              ON baseline_activities.id = baseline_activities_fts.activity_id
            WHERE baseline_activities_fts MATCH ?
              AND baseline_activities_fts.project_id = ?
            ORDER BY bm25(baseline_activities_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, (normalized, project_id, limit))
        return [(_baseline_activity_row(row), row["_snippet"]) for row in rows]
