from __future__ import annotations

from typing import Any

from ...core.db.fts import normalize_fts_query
from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import HypothesisActivityKind, HypothesisActivityRecord
from ..base import BaseRepository
from .command import AddHypothesisActivity


def _hypothesis_activity_row(row: Any) -> HypothesisActivityRecord:
    return HypothesisActivityRecord(
        id=row["id"],
        hypothesis_id=row["hypothesis_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class HypothesisActivitiesRepository(BaseRepository):
    async def add(
        self,
        *,
        hypothesis_id: str,
        actor: str,
        kind: HypothesisActivityKind | str,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> HypothesisActivityRecord:
        command = AddHypothesisActivity(
            hypothesis_id=hypothesis_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        cursor = await self.db.execute(
            """
            INSERT INTO hypothesis_activities
              (hypothesis_id, created_in_session_id, actor, kind, body, payload_json,
               created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.hypothesis_id,
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
            raise RuntimeError("hypothesis activity was not persisted")
        return record

    async def get_by_id(self, *, activity_id: int) -> HypothesisActivityRecord | None:
        row = await self.db.fetchone("SELECT * FROM hypothesis_activities WHERE id = ?", (activity_id,))
        return _hypothesis_activity_row(row) if row else None

    async def get(self, *, activity_id: int) -> HypothesisActivityRecord | None:
        return await self.get_by_id(activity_id=activity_id)

    async def list_all(self) -> list[HypothesisActivityRecord]:
        return [
            _hypothesis_activity_row(row)
            for row in await self.db.fetchall("SELECT * FROM hypothesis_activities ORDER BY id")
        ]

    async def list_for_hypothesis(self, *, hypothesis_id: str) -> list[HypothesisActivityRecord]:
        return [
            _hypothesis_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM hypothesis_activities WHERE hypothesis_id = ? ORDER BY id",
                (hypothesis_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[HypothesisActivityRecord]:
        return [
            _hypothesis_activity_row(row)
            for row in await self.db.fetchall(
                """
                SELECT hypothesis_activities.*
                FROM hypothesis_activities
                JOIN hypotheses ON hypotheses.id = hypothesis_activities.hypothesis_id
                WHERE hypotheses.project_id = ?
                ORDER BY hypothesis_activities.id
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[HypothesisActivityRecord]:
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
    ) -> list[tuple[HypothesisActivityRecord, str]]:
        normalized = normalize_fts_query(query)
        if not normalized:
            return []
        sql = """
            SELECT hypothesis_activities.*,
                   snippet(hypothesis_activities_fts, -1, '[', ']', '...', 12) AS _snippet
            FROM hypothesis_activities_fts
            JOIN hypothesis_activities
              ON hypothesis_activities.id = hypothesis_activities_fts.activity_id
            WHERE hypothesis_activities_fts MATCH ?
              AND hypothesis_activities_fts.project_id = ?
            ORDER BY bm25(hypothesis_activities_fts)
            LIMIT ?
        """
        rows = await self.db.fetchall(sql, (normalized, project_id, limit))
        return [(_hypothesis_activity_row(row), row["_snippet"]) for row in rows]
