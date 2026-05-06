from __future__ import annotations

from typing import Any

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
    def add(
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
        cursor = self.db.execute(
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
        record = self.get_by_id(int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("analysis activity was not persisted")
        return record

    def get_by_id(self, activity_id: int) -> AnalysisActivityRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM analysis_activities WHERE id = ?",
            (activity_id,),
        )
        return _analysis_activity_row(row) if row else None

    def get(self, activity_id: int) -> AnalysisActivityRecord | None:
        return self.get_by_id(activity_id)

    def list_all(self) -> list[AnalysisActivityRecord]:
        return [
            _analysis_activity_row(row)
            for row in self.db.fetchall("SELECT * FROM analysis_activities ORDER BY id")
        ]

    def list_for_analysis(self, analysis_id: str) -> list[AnalysisActivityRecord]:
        return [
            _analysis_activity_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM analysis_activities WHERE analysis_id = ? ORDER BY id",
                (analysis_id,),
            )
        ]

    def list_for_project(self, project_id: str) -> list[AnalysisActivityRecord]:
        return [
            _analysis_activity_row(row)
            for row in self.db.fetchall(
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

    def list_for_session(self, session_id: str) -> list[AnalysisActivityRecord]:
        session = self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return self.list_for_project(project_id) if project_id is not None else []
