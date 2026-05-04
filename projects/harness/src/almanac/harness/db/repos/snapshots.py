from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from ..database import Database
from ..serialization import config_row, event_row, evidence_row, experiment_row, finding_row


class SnapshotsRepository(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    db: Database

    def get(self) -> dict[str, Any]:
        config = self.db.fetchone("SELECT * FROM project_config WHERE id = ?", (self.db.project_id,))
        runs = [dict(row) for row in self.db.fetchall("SELECT * FROM runs ORDER BY created_at")]
        experiments = [
            experiment_row(row)
            for row in self.db.fetchall("SELECT * FROM experiments ORDER BY created_at")
        ]
        evidence = [evidence_row(row) for row in self.db.fetchall("SELECT * FROM evidence ORDER BY id")]
        findings = [
            finding_row(row)
            for row in self.db.fetchall("SELECT * FROM findings ORDER BY created_at")
        ]
        warnings = [dict(row) for row in self.db.fetchall("SELECT * FROM warnings ORDER BY id")]
        events = [event_row(row) for row in self.db.fetchall("SELECT * FROM events ORDER BY id")]

        return {
            "config": config_row(config) if config else None,
            "runs": runs,
            "experiments": experiments,
            "evidence": evidence,
            "findings": findings,
            "warnings": warnings,
            "events": events,
        }
