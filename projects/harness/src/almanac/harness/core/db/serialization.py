from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from typing import Any

from ...records import (
    AgentMessageHistoryRecord,
    EventRecord,
    EvidenceRecord,
    ExperimentRecord,
    FindingRecord,
    ProjectConfigRecord,
    RunRecord,
    WarningRecord,
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def json_dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True)


def json_loads(value: str) -> Any:
    return json.loads(value)


def config_row(row: sqlite3.Row) -> ProjectConfigRecord:
    return ProjectConfigRecord(
        id=row["id"],
        repo_path=row["repo_path"],
        goal=row["goal"],
        evaluation_context=row["evaluation_context"],
        known_signals=json_loads(row["known_signals_json"]),
        experiment_scope=row["experiment_scope"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def run_row(row: sqlite3.Row) -> RunRecord:
    return RunRecord(
        id=row["id"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def experiment_row(row: sqlite3.Row) -> ExperimentRecord:
    return ExperimentRecord(
        id=row["id"],
        run_id=row["run_id"],
        status=row["status"],
        intent=row["intent"],
        change_summary=row["change_summary"],
        components=json_loads(row["components_json"]),
        based_on=json_loads(row["based_on_json"]),
        suspicious=bool(row["suspicious"]),
        suspicious_reason=row["suspicious_reason"],
        note=row["note"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def evidence_row(row: sqlite3.Row) -> EvidenceRecord:
    return EvidenceRecord(
        id=row["id"],
        run_id=row["run_id"],
        experiment_id=row["experiment_id"],
        summary=row["summary"],
        signals=json_loads(row["signals_json"]),
        raw=json_loads(row["raw_json"]),
        created_at=row["created_at"],
    )


def finding_row(row: sqlite3.Row) -> FindingRecord:
    return FindingRecord(
        id=row["id"],
        run_id=row["run_id"],
        summary=row["summary"],
        evidence_experiment_ids=json_loads(row["evidence_experiment_ids_json"]),
        confidence=row["confidence"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def warning_row(row: sqlite3.Row) -> WarningRecord:
    return WarningRecord(
        id=row["id"],
        run_id=row["run_id"],
        experiment_id=row["experiment_id"],
        kind=row["kind"],
        message=row["message"],
        created_at=row["created_at"],
    )


def event_row(row: sqlite3.Row) -> EventRecord:
    return EventRecord(
        id=row["id"],
        run_id=row["run_id"],
        type=row["type"],
        message=row["message"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


def agent_message_history_row(row: sqlite3.Row) -> AgentMessageHistoryRecord:
    return AgentMessageHistoryRecord(
        id=row["id"],
        run_id=row["run_id"],
        agent_name=row["agent_name"],
        pydantic_run_id=row["pydantic_run_id"],
        conversation_id=row["conversation_id"],
        messages=json_loads(row["messages_json"]),
        message_count=row["message_count"],
        created_at=row["created_at"],
    )
