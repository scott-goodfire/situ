from __future__ import annotations

from typing import Any

from ...core.db.serialization import utc_now
from ...records import HypothesisExperimentLinkRecord
from ..base import BaseRepository
from .command import LinkHypothesisExperiment


def _hypothesis_experiment_link_row(row: Any) -> HypothesisExperimentLinkRecord:
    return HypothesisExperimentLinkRecord(
        hypothesis_id=row["hypothesis_id"],
        experiment_id=row["experiment_id"],
        created_at=row["created_at"],
    )


class HypothesisExperimentLinksRepository(BaseRepository):
    async def create(
        self,
        *,
        hypothesis_id: str,
        experiment_id: str,
    ) -> HypothesisExperimentLinkRecord:
        command = LinkHypothesisExperiment(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
        )
        await self.db.execute(
            """
            INSERT INTO hypothesis_experiment_links
              (hypothesis_id, experiment_id, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(hypothesis_id, experiment_id) DO NOTHING
            """,
            (
                command.hypothesis_id,
                command.experiment_id,
                utc_now(),
            ),
        )
        record = await self.get(
            hypothesis_id=command.hypothesis_id,
            experiment_id=command.experiment_id,
        )
        if record is None:
            raise RuntimeError(
                "hypothesis/experiment link was not persisted: "
                f"{command.hypothesis_id} -> {command.experiment_id}"
            )
        return record

    async def get(
        self,
        *,
        hypothesis_id: str,
        experiment_id: str,
    ) -> HypothesisExperimentLinkRecord | None:
        row = await self.db.fetchone(
            """
            SELECT * FROM hypothesis_experiment_links
            WHERE hypothesis_id = ? AND experiment_id = ?
            """,
            (hypothesis_id, experiment_id),
        )
        return _hypothesis_experiment_link_row(row) if row else None

    async def list_all(self) -> list[HypothesisExperimentLinkRecord]:
        return [
            _hypothesis_experiment_link_row(row)
            for row in await self.db.fetchall(
                "SELECT * FROM hypothesis_experiment_links ORDER BY created_at"
            )
        ]

    async def list_for_hypothesis(
        self,
        *,
        hypothesis_id: str,
    ) -> list[HypothesisExperimentLinkRecord]:
        return [
            _hypothesis_experiment_link_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM hypothesis_experiment_links
                WHERE hypothesis_id = ?
                ORDER BY created_at
                """,
                (hypothesis_id,),
            )
        ]

    async def list_for_experiment(
        self,
        *,
        experiment_id: str,
    ) -> list[HypothesisExperimentLinkRecord]:
        return [
            _hypothesis_experiment_link_row(row)
            for row in await self.db.fetchall(
                """
                SELECT * FROM hypothesis_experiment_links
                WHERE experiment_id = ?
                ORDER BY created_at
                """,
                (experiment_id,),
            )
        ]
