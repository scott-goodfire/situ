from __future__ import annotations

from typing import Any

from ..serialization import (
    config_row,
    event_row,
    evidence_row,
    experiment_row,
    finding_row,
    run_row,
    warning_row,
)
from .base import BaseRepository


class SnapshotsRepository(BaseRepository):
    def get(self) -> dict[str, Any]:
        config = self.db.fetchone("SELECT * FROM project_config WHERE id = ?", (self.db.project_id,))
        runs = [
            run_row(row).model_dump()
            for row in self.db.fetchall("SELECT * FROM runs ORDER BY created_at")
        ]
        experiments = [
            experiment_row(row).model_dump()
            for row in self.db.fetchall("SELECT * FROM experiments ORDER BY created_at")
        ]
        evidence = [
            evidence_row(row).model_dump()
            for row in self.db.fetchall("SELECT * FROM evidence ORDER BY id")
        ]
        findings = [
            finding_row(row).model_dump()
            for row in self.db.fetchall("SELECT * FROM findings ORDER BY created_at")
        ]
        warnings = [
            warning_row(row).model_dump()
            for row in self.db.fetchall("SELECT * FROM warnings ORDER BY id")
        ]
        events = [
            event_row(row).model_dump()
            for row in self.db.fetchall("SELECT * FROM events ORDER BY id")
        ]

        return {
            "config": config_row(config).model_dump() if config else None,
            "runs": runs,
            "experiments": experiments,
            "evidence": evidence,
            "findings": findings,
            "warnings": warnings,
            "events": events,
        }
