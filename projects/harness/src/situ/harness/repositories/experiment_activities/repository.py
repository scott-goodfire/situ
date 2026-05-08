from __future__ import annotations

from typing import Any

from ...core.db.serialization import json_dumps, json_loads, utc_now
from ...records import ExperimentActivityKind, ExperimentActivityRecord
from ..base import BaseRepository
from .command import AddExperimentActivity


def _experiment_activity_row(row: Any) -> ExperimentActivityRecord:
    return ExperimentActivityRecord(
        id=row["id"],
        experiment_id=row["experiment_id"],
        created_in_session_id=row["created_in_session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


class ExperimentActivitiesRepository(BaseRepository):
    async def add(
        self,
        *,
        experiment_id: str,
        actor: str,
        kind: ExperimentActivityKind | str,
        body: str,
        payload: dict[str, Any] | None = None,
        created_in_session_id: str | None = None,
    ) -> ExperimentActivityRecord:
        command = AddExperimentActivity(
            experiment_id=experiment_id,
            created_in_session_id=created_in_session_id,
            actor=actor,
            kind=kind,
            body=body,
            payload=payload or {},
        )
        cursor = await self.db.execute(
            """
            INSERT INTO experiment_activities
              (experiment_id, created_in_session_id, actor, kind, body, payload_json,
               created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                command.experiment_id,
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
            raise RuntimeError("experiment activity was not persisted")
        return record

    async def get_by_id(self, *, activity_id: int) -> ExperimentActivityRecord | None:
        row = await self.db.fetchone("SELECT * FROM experiment_activities WHERE id = ?", (activity_id,))
        return _experiment_activity_row(row) if row else None

    async def get(self, *, activity_id: int) -> ExperimentActivityRecord | None:
        return await self.get_by_id(activity_id=activity_id)

    async def list_all(self) -> list[ExperimentActivityRecord]:
        return [
            _experiment_activity_row(row)
            for row in await self.db.fetchall("SELECT * FROM experiment_activities ORDER BY id")
        ]

    async def list_for_experiment(self, *, experiment_id: str) -> list[ExperimentActivityRecord]:
        return [
            _experiment_activity_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM experiment_activities WHERE experiment_id = ? ORDER BY id",
                (experiment_id,),
            )
        ]

    async def list_for_project(self, *, project_id: str) -> list[ExperimentActivityRecord]:
        return [
            _experiment_activity_row(row)
            for row in await self.db.fetchall(
                """
                SELECT experiment_activities.*
                FROM experiment_activities
                JOIN experiments ON experiments.id = experiment_activities.experiment_id
                WHERE experiments.project_id = ?
                ORDER BY experiment_activities.id
                """,
                (project_id,),
            )
        ]

    async def list_for_session(self, *, session_id: str) -> list[ExperimentActivityRecord]:
        session = await self.db.fetchone("SELECT project_id FROM sessions WHERE id = ?", (session_id,))
        project_id = session["project_id"] if session else None
        return (
            await self.list_for_project(project_id=project_id)
            if project_id is not None
            else []
        )
