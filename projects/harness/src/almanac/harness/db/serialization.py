from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from typing import Any


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def json_dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True)


def json_loads(value: str) -> Any:
    return json.loads(value)


def config_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "repo_path": row["repo_path"],
        "goal": row["goal"],
        "evaluation_context": row["evaluation_context"],
        "known_signals": json_loads(row["known_signals_json"]),
        "experiment_scope": row["experiment_scope"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def experiment_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "run_id": row["run_id"],
        "status": row["status"],
        "intent": row["intent"],
        "change_summary": row["change_summary"],
        "components": json_loads(row["components_json"]),
        "based_on": json_loads(row["based_on_json"]),
        "suspicious": bool(row["suspicious"]),
        "suspicious_reason": row["suspicious_reason"],
        "note": row["note"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def evidence_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "run_id": row["run_id"],
        "experiment_id": row["experiment_id"],
        "summary": row["summary"],
        "signals": json_loads(row["signals_json"]),
        "raw": json_loads(row["raw_json"]),
        "created_at": row["created_at"],
    }


def finding_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "run_id": row["run_id"],
        "summary": row["summary"],
        "evidence_experiment_ids": json_loads(row["evidence_experiment_ids_json"]),
        "confidence": row["confidence"],
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def event_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "run_id": row["run_id"],
        "type": row["type"],
        "message": row["message"],
        "payload": json_loads(row["payload_json"]),
        "created_at": row["created_at"],
    }
