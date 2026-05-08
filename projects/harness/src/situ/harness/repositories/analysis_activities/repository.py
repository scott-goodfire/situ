from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import AnalysisActivityKind, AnalysisActivityRecord
from ..base import BaseRepository
from .command import AddAnalysisActivity


def _analysis_activity_row(row: Any) -> AnalysisActivityRecord:
    return AnalysisActivityRecord(
        id=row["id"],
        analysis_id=row["analysis_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class AnalysisActivitiesRepository(BaseRepository):
    async def add(
        self,
        *,
        analysis_id: str,
        actor: str,
        kind: AnalysisActivityKind | str,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> AnalysisActivityRecord:
        command = AddAnalysisActivity(
            analysis_id=analysis_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        cursor = await self.db.execute(
            """
            INSERT INTO analysis_activities
              (analysis_id, created_in_session_id, actor, kind, body,
               payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.analysis_id,
                command.created_in_session_id,
                command.actor,
                command.kind,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = await self.get_by_id(activity_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("analysis activity was not persisted")
        return record

    async def get_by_id(self, *, activity_id: int) -> AnalysisActivityRecord | None:
        row = await self.db.fetchone(
            "SELECT * FROM analysis_activities WHERE id = ?",
            (activity_id,),
        )
        return _analysis_activity_row(row) if row else None

    async def get(self, *, activity_id: int) -> AnalysisActivityRecord | None:
        return await self.get_by_id(activity_id=activity_id)

    async def list_all(self) -> list[AnalysisActivityRecord]:
        return [
            _analysis_activity_row(row)
            for row in await self.db.fetchall("SELECT * FROM analysis_activities ORDER BY id")
        ]

    async def list_for_analysis(self, *, analysis_id: str) -> list[AnalysisActivityRecord]:
        return [
            _analysis_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM analysis_activities WHERE analysis_id = ? ORDER BY id",
                (analysis_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[AnalysisActivityRecord]:
        return [
            _analysis_activity_row(row)
            for row in await self.db.fetchall(
                """
                SELECT analysis_activities.*
                FROM analysis_activities
                JOIN analyses ON analyses.id = analysis_activities.analysis_id
                WHERE analyses.project_id = ?
                ORDER BY analysis_activities.id
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[AnalysisActivityRecord]:
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
    ) -> list[tuple[AnalysisActivityRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        sql = """
            SELECT analysis_activities.*,
                   snippet(analysis_activities_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM analysis_activities_fts
            JOIN analysis_activities
              ON analysis_activities.id = analysis_activities_fts.activity_id
            WHERE analysis_activities_fts MATCH ?
              AND analysis_activities_fts.project_id = ?
            ORDER BY bm25(analysis_activities_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, (normalized, project_id, limit))
        return [(_analysis_activity_row(row), row["_snippet"]) for row in rows]
