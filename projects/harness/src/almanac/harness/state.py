from __future__ import annotations

import json
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


class StateStore:
    def __init__(self, path: Path, *, project_id: str, repo_path: str) -> None:
        self.path = path
        self.project_id = project_id
        self.repo_path = repo_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA journal_mode = WAL")
        self._db.execute("PRAGMA foreign_keys = ON")
        self._migrate()

    def _migrate(self) -> None:
        with self._db:
            self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS project_config (
                  id TEXT PRIMARY KEY,
                  repo_path TEXT NOT NULL,
                  goal TEXT NOT NULL,
                  evaluation_context TEXT NOT NULL,
                  known_signals_json TEXT NOT NULL,
                  experiment_scope TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS runs (
                  id TEXT PRIMARY KEY,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS experiments (
                  id TEXT PRIMARY KEY,
                  run_id TEXT NOT NULL REFERENCES runs(id),
                  status TEXT NOT NULL,
                  intent TEXT NOT NULL,
                  change_summary TEXT NOT NULL,
                  components_json TEXT NOT NULL,
                  based_on_json TEXT NOT NULL,
                  suspicious INTEGER NOT NULL DEFAULT 0,
                  suspicious_reason TEXT,
                  note TEXT NOT NULL DEFAULT '',
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS evidence (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  run_id TEXT NOT NULL REFERENCES runs(id),
                  experiment_id TEXT NOT NULL REFERENCES experiments(id),
                  summary TEXT NOT NULL,
                  signals_json TEXT NOT NULL,
                  raw_json TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS findings (
                  id TEXT PRIMARY KEY,
                  run_id TEXT NOT NULL REFERENCES runs(id),
                  summary TEXT NOT NULL,
                  evidence_experiment_ids_json TEXT NOT NULL,
                  confidence TEXT NOT NULL,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS warnings (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  run_id TEXT NOT NULL REFERENCES runs(id),
                  experiment_id TEXT REFERENCES experiments(id),
                  kind TEXT NOT NULL,
                  message TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS events (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  run_id TEXT REFERENCES runs(id),
                  type TEXT NOT NULL,
                  message TEXT NOT NULL,
                  payload_json TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                """
            )

    def get_config(self) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute("SELECT * FROM project_config WHERE id = ?", (self.project_id,)).fetchone()
        return self._config_row(row) if row else None

    def set_config(
        self,
        *,
        goal: str,
        evaluation_context: str,
        known_signals: list[str],
        experiment_scope: str,
    ) -> dict[str, Any]:
        now = utc_now()
        existing = self.get_config()
        created_at = existing["created_at"] if existing else now
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO project_config
                  (id, repo_path, goal, evaluation_context, known_signals_json,
                   experiment_scope, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  repo_path = excluded.repo_path,
                  goal = excluded.goal,
                  evaluation_context = excluded.evaluation_context,
                  known_signals_json = excluded.known_signals_json,
                  experiment_scope = excluded.experiment_scope,
                  updated_at = excluded.updated_at
                """,
                (
                    self.project_id,
                    self.repo_path,
                    goal,
                    evaluation_context,
                    json.dumps(known_signals),
                    experiment_scope,
                    created_at,
                    now,
                ),
            )
        return self.get_config() or {}

    def create_run(self, run_id: str) -> dict[str, Any]:
        now = utc_now()
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO runs (id, status, created_at, updated_at) VALUES (?, 'running', ?, ?)",
                (run_id, now, now),
            )
        return self.get_run(run_id) or {}

    def update_run_status(self, run_id: str, status: str) -> dict[str, Any] | None:
        with self._lock, self._db:
            self._db.execute(
                "UPDATE runs SET status = ?, updated_at = ? WHERE id = ?",
                (status, utc_now(), run_id),
            )
        return self.get_run(run_id)

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
        return dict(row) if row else None

    def create_experiment(
        self,
        *,
        experiment_id: str,
        run_id: str,
        intent: str,
        change_summary: str,
        components: list[str],
        based_on: list[str],
    ) -> dict[str, Any]:
        now = utc_now()
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO experiments
                  (id, run_id, status, intent, change_summary, components_json,
                   based_on_json, created_at, updated_at)
                VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?)
                """,
                (
                    experiment_id,
                    run_id,
                    intent,
                    change_summary,
                    json.dumps(components),
                    json.dumps(based_on),
                    now,
                    now,
                ),
            )
        return self.get_experiment(experiment_id) or {}

    def update_experiment(
        self,
        experiment_id: str,
        *,
        status: str,
        suspicious: bool | None = None,
        suspicious_reason: str | None = None,
        note: str | None = None,
    ) -> dict[str, Any] | None:
        current = self.get_experiment(experiment_id)
        if current is None:
            return None
        next_suspicious = current["suspicious"] if suspicious is None else suspicious
        next_reason = current["suspicious_reason"] if suspicious_reason is None else suspicious_reason
        next_note = current["note"] if note is None else note
        with self._lock, self._db:
            self._db.execute(
                """
                UPDATE experiments
                SET status = ?, suspicious = ?, suspicious_reason = ?, note = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, int(next_suspicious), next_reason, next_note, utc_now(), experiment_id),
            )
        return self.get_experiment(experiment_id)

    def get_experiment(self, experiment_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,)).fetchone()
        return self._experiment_row(row) if row else None

    def add_evidence(
        self,
        *,
        run_id: str,
        experiment_id: str,
        summary: str,
        signals: list[dict[str, Any]],
        raw: dict[str, Any],
    ) -> dict[str, Any]:
        created_at = utc_now()
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                INSERT INTO evidence
                  (run_id, experiment_id, summary, signals_json, raw_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    experiment_id,
                    summary,
                    json.dumps(signals, sort_keys=True),
                    json.dumps(raw, sort_keys=True),
                    created_at,
                ),
            )
            evidence_id = int(cursor.lastrowid)
        return {
            "id": evidence_id,
            "run_id": run_id,
            "experiment_id": experiment_id,
            "summary": summary,
            "signals": signals,
            "raw": raw,
            "created_at": created_at,
        }

    def upsert_finding(
        self,
        *,
        finding_id: str,
        run_id: str,
        summary: str,
        evidence_experiment_ids: list[str],
        confidence: str,
        status: str,
    ) -> dict[str, Any]:
        now = utc_now()
        existing = self.get_finding(finding_id)
        created_at = existing["created_at"] if existing else now
        with self._lock, self._db:
            self._db.execute(
                """
                INSERT INTO findings
                  (id, run_id, summary, evidence_experiment_ids_json, confidence,
                   status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  summary = excluded.summary,
                  evidence_experiment_ids_json = excluded.evidence_experiment_ids_json,
                  confidence = excluded.confidence,
                  status = excluded.status,
                  updated_at = excluded.updated_at
                """,
                (
                    finding_id,
                    run_id,
                    summary,
                    json.dumps(evidence_experiment_ids),
                    confidence,
                    status,
                    created_at,
                    now,
                ),
            )
        return self.get_finding(finding_id) or {}

    def get_finding(self, finding_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute("SELECT * FROM findings WHERE id = ?", (finding_id,)).fetchone()
        return self._finding_row(row) if row else None

    def add_warning(
        self,
        *,
        run_id: str,
        kind: str,
        message: str,
        experiment_id: str | None = None,
    ) -> dict[str, Any]:
        created_at = utc_now()
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                INSERT INTO warnings (run_id, experiment_id, kind, message, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (run_id, experiment_id, kind, message, created_at),
            )
            warning_id = int(cursor.lastrowid)
        return {
            "id": warning_id,
            "run_id": run_id,
            "experiment_id": experiment_id,
            "kind": kind,
            "message": message,
            "created_at": created_at,
        }

    def add_event(
        self,
        *,
        event_type: str,
        message: str,
        run_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        created_at = utc_now()
        with self._lock, self._db:
            cursor = self._db.execute(
                """
                INSERT INTO events (run_id, type, message, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (run_id, event_type, message, json.dumps(payload or {}, sort_keys=True), created_at),
            )
            event_id = int(cursor.lastrowid)
        return {
            "id": event_id,
            "run_id": run_id,
            "type": event_type,
            "message": message,
            "payload": payload or {},
            "created_at": created_at,
        }

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            config_row = self._db.execute("SELECT * FROM project_config WHERE id = ?", (self.project_id,)).fetchone()
            runs = [dict(row) for row in self._db.execute("SELECT * FROM runs ORDER BY created_at")]
            experiments = [
                self._experiment_row(row)
                for row in self._db.execute("SELECT * FROM experiments ORDER BY created_at")
            ]
            evidence = [
                self._evidence_row(row)
                for row in self._db.execute("SELECT * FROM evidence ORDER BY id")
            ]
            findings = [
                self._finding_row(row)
                for row in self._db.execute("SELECT * FROM findings ORDER BY created_at")
            ]
            warnings = [
                dict(row) for row in self._db.execute("SELECT * FROM warnings ORDER BY id")
            ]
            events = [
                self._event_row(row)
                for row in self._db.execute("SELECT * FROM events ORDER BY id")
            ]

        return {
            "config": self._config_row(config_row) if config_row else None,
            "runs": runs,
            "experiments": experiments,
            "evidence": evidence,
            "findings": findings,
            "warnings": warnings,
            "events": events,
        }

    def _config_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "repo_path": row["repo_path"],
            "goal": row["goal"],
            "evaluation_context": row["evaluation_context"],
            "known_signals": json.loads(row["known_signals_json"]),
            "experiment_scope": row["experiment_scope"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _experiment_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "run_id": row["run_id"],
            "status": row["status"],
            "intent": row["intent"],
            "change_summary": row["change_summary"],
            "components": json.loads(row["components_json"]),
            "based_on": json.loads(row["based_on_json"]),
            "suspicious": bool(row["suspicious"]),
            "suspicious_reason": row["suspicious_reason"],
            "note": row["note"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _evidence_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "run_id": row["run_id"],
            "experiment_id": row["experiment_id"],
            "summary": row["summary"],
            "signals": json.loads(row["signals_json"]),
            "raw": json.loads(row["raw_json"]),
            "created_at": row["created_at"],
        }

    def _finding_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "run_id": row["run_id"],
            "summary": row["summary"],
            "evidence_experiment_ids": json.loads(row["evidence_experiment_ids_json"]),
            "confidence": row["confidence"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def _event_row(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "run_id": row["run_id"],
            "type": row["type"],
            "message": row["message"],
            "payload": json.loads(row["payload_json"]),
            "created_at": row["created_at"],
        }
