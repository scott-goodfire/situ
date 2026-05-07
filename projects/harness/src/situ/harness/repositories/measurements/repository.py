from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import MeasurementRecord
from ..base import BaseRepository
from .command import AddMeasurement


def _measurement_row(row: Any) -> MeasurementRecord:
    return MeasurementRecord(
        id=row["id"],
        evaluation_id=row["evaluation_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class MeasurementsRepository(BaseRepository):
    def add(
        self,
        *,
        evaluation_id: str,
        actor: str,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> MeasurementRecord:
        command = AddMeasurement(
            evaluation_id=evaluation_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            body=body,
            payload=payload or {},
        )
        cursor = self.db.execute(
            """
            INSERT INTO measurements
              (evaluation_id, created_in_session_id, actor, body, payload_json,
               created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.evaluation_id,
                command.created_in_session_id,
                command.actor,
                command.body,
                json_dumps(command.payload.to_storage_dict()),
                utc_now(),
            ),
        )
        record = self.get_by_id(measurement_id=int(cursor.lastrowid))
        if record is None:
            raise RuntimeError("measurement was not persisted")
        return record

    def get_by_id(self, *, measurement_id: int) -> MeasurementRecord | None:
        row = self.db.fetchone(
            "SELECT * FROM measurements WHERE id = ?",
            (measurement_id,),
        )
        return _measurement_row(row) if row else None

    def get(self, *, measurement_id: int) -> MeasurementRecord | None:
        return self.get_by_id(measurement_id=measurement_id)

    def list_all(self) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall("SELECT * FROM measurements ORDER BY id")
        ]

    def list_for_evaluation(self, *, evaluation_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM measurements WHERE evaluation_id = ? ORDER BY id",
                (evaluation_id,),
            )
        ]

    def list_for_baseline(self, *, baseline_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall(
                """
                SELECT measurements.*
                FROM measurements
                JOIN evaluations ON evaluations.id = measurements.evaluation_id
                WHERE evaluations.associated_baseline_id = ?
                ORDER BY measurements.id
                """,
                (baseline_id,),
            )
        ]

    def list_for_experiment(self, *, experiment_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall(
                """
                SELECT measurements.*
                FROM measurements
                JOIN evaluations ON evaluations.id = measurements.evaluation_id
                WHERE evaluations.associated_experiment_id = ?
                ORDER BY measurements.id
                """,
                (experiment_id,),
            )
        ]

    def list_for_project(self, *, project_id: str) -> list[MeasurementRecord]:
        return [
            _measurement_row(row)
            for row in self.db.fetchall(
                """
                SELECT measurements.*
                FROM measurements
                JOIN evaluations ON evaluations.id = measurements.evaluation_id
                WHERE evaluations.project_id = ?
                ORDER BY measurements.id
                """,
                (project_id,),
            )
        ]

    def list_for_session(self, *, session_id: str) -> list[MeasurementRecord]:
        session = self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )
