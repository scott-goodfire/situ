from __future__ import annotations

from typing import Any

from ...core.db.serialization import experiment_activity_row, json_dumps, utc_now
from ...records import ExperimentActivityRecord
from ..base import BaseRepository
from .command import AddExperimentActivity


class ExperimentActivitiesRepository(BaseRepository):
    def add(
        self,
        *,
        experiment_id: str,
        actor: str,
        kind: str,
        body: str,
        session_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> ExperimentActivityRecord:
        command = AddExperimentActivity(
            experiment_id=experiment_id,
            actor=actor,
            kind=kind,
            body=body,
            session_id=session_id,
            payload=payload or {},
        )
        cursor = self.db.execute(
            """
            INSERT INTO experiment_activities
              (experiment_id, session_id, actor, kind, body, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
                command.session_id,
                command.actor,
                command.kind,
                command.body,
                json_dumps(command.payload),
                utc_now(),
            ),
        )
        record = self.get_by_id(int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("experiment activity was not persisted")
        return record

    def get_by_id(self, activity_id: int) -> ExperimentActivityRecord | None:
        row = self.db.fetchone("SELECT * FROM experiment_activities WHERE id = ?", (activity_id,))
        return experiment_activity_row(row) if row else None

    def get(self, activity_id: int) -> ExperimentActivityRecord | None:
        return self.get_by_id(activity_id)

    def list_all(self) -> list[ExperimentActivityRecord]:
        return [
            experiment_activity_row(row)
            for row in self.db.fetchall("SELECT * FROM experiment_activities ORDER BY id")
        ]

    def list_for_experiment(self, experiment_id: str) -> list[ExperimentActivityRecord]:
        return [
            experiment_activity_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiment_activities WHERE experiment_id = ? ORDER BY id",
                (experiment_id,),
            )
        ]

    def list_for_session(self, session_id: str) -> list[ExperimentActivityRecord]:
        return [
            experiment_activity_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM experiment_activities WHERE session_id = ? ORDER BY id",
                (session_id,),
            )
        ]
