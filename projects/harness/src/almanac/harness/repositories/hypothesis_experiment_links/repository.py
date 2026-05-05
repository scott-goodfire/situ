from __future__ import annotations

from ...core.db.serialization import hypothesis_experiment_link_row, utc_now
from ...records import HypothesisExperimentLinkRecord
from ..base import BaseRepository
from .command import LinkHypothesisExperiment


class HypothesisExperimentLinksRepository(BaseRepository):
    def create(
        self,
        *,
        hypothesis_id: str,
        experiment_id: str,
        note: str = "",
    ) -> HypothesisExperimentLinkRecord:
        command = LinkHypothesisExperiment(
            hypothesis_id=hypothesis_id,
            experiment_id=experiment_id,
            note=note,
        )
        self.db.execute(
            """
            INSERT INTO hypothesis_experiment_links
              (hypothesis_id, experiment_id, note, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(hypothesis_id, experiment_id) DO UPDATE SET
              note = excluded.note
            """,
            (
                command.hypothesis_id,
                command.experiment_id,
                command.note,
                utc_now(),
            ),
        )
        record = self.get(command.hypothesis_id, command.experiment_id)
        if record is None:
            raise RuntimeError(
                "hypothesis/experiment link was not persisted: "
                f"{command.hypothesis_id} -> {command.experiment_id}"
            )
        return record

    def get(
        self,
        hypothesis_id: str,
        experiment_id: str,
    ) -> HypothesisExperimentLinkRecord | None:
        row = self.db.fetchone(
            """
            SELECT * FROM hypothesis_experiment_links
            WHERE hypothesis_id = ? AND experiment_id = ?
            """,
            (hypothesis_id, experiment_id),
        )
        return hypothesis_experiment_link_row(row) if row else None

    def list_all(self) -> list[HypothesisExperimentLinkRecord]:
        return [
            hypothesis_experiment_link_row(row)
            for row in self.db.fetchall(
                "SELECT * FROM hypothesis_experiment_links ORDER BY created_at"
            )
        ]

    def list_for_hypothesis(self, hypothesis_id: str) -> list[HypothesisExperimentLinkRecord]:
        return [
            hypothesis_experiment_link_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM hypothesis_experiment_links
                WHERE hypothesis_id = ?
                ORDER BY created_at
                """,
                (hypothesis_id,),
            )
        ]

    def list_for_experiment(self, experiment_id: str) -> list[HypothesisExperimentLinkRecord]:
        return [
            hypothesis_experiment_link_row(row)
            for row in self.db.fetchall(
                """
                SELECT * FROM hypothesis_experiment_links
                WHERE experiment_id = ?
                ORDER BY created_at
                """,
                (experiment_id,),
            )
        ]
