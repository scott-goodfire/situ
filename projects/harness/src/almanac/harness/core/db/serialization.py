from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from typing import Any

from ...records import (
    AgentMessageHistoryRecord,
    ArtifactRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    ObjectiveRecord,
    ProjectConfigRecord,
    SessionRecord,
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
        research_context=row["research_context"],
        associated_session_id=row["associated_session_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def objective_row(row: sqlite3.Row) -> ObjectiveRecord:
    return ObjectiveRecord(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        status=row["status"],
        associated_session_id=row["associated_session_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def session_row(row: sqlite3.Row) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        objective_id=row["objective_id"],
        objective=row["objective"],
        research_context=row["research_context"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def hypothesis_row(row: sqlite3.Row) -> HypothesisRecord:
    return HypothesisRecord(
        id=row["id"],
        objective_id=row["objective_id"],
        title=row["title"],
        summary=row["summary"],
        status=row["status"],
        associated_session_id=row["associated_session_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def experiment_row(row: sqlite3.Row) -> ExperimentRecord:
    return ExperimentRecord(
        id=row["id"],
        objective_id=row["objective_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        associated_session_id=row["associated_session_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def evaluation_row(row: sqlite3.Row) -> EvaluationRecord:
    return EvaluationRecord(
        id=row["id"],
        objective_id=row["objective_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        associated_session_id=row["associated_session_id"],
        associated_experiment_id=row["associated_experiment_id"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def hypothesis_experiment_link_row(row: sqlite3.Row) -> HypothesisExperimentLinkRecord:
    return HypothesisExperimentLinkRecord(
        hypothesis_id=row["hypothesis_id"],
        experiment_id=row["experiment_id"],
        created_at=row["created_at"],
    )


def hypothesis_activity_row(row: sqlite3.Row) -> HypothesisActivityRecord:
    return HypothesisActivityRecord(
        id=row["id"],
        hypothesis_id=row["hypothesis_id"],
        session_id=row["session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


def experiment_activity_row(row: sqlite3.Row) -> ExperimentActivityRecord:
    return ExperimentActivityRecord(
        id=row["id"],
        experiment_id=row["experiment_id"],
        session_id=row["session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


def evaluation_activity_row(row: sqlite3.Row) -> EvaluationActivityRecord:
    return EvaluationActivityRecord(
        id=row["id"],
        evaluation_id=row["evaluation_id"],
        session_id=row["session_id"],
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


def artifact_row(row: sqlite3.Row) -> ArtifactRecord:
    return ArtifactRecord(
        id=row["id"],
        objective_id=row["objective_id"],
        associated_session_id=row["associated_session_id"],
        associated_entity_kind=row["associated_entity_kind"],
        associated_entity_id=row["associated_entity_id"],
        kind=row["kind"],
        title=row["title"],
        path=row["path"],
        media_type=row["media_type"],
        size_bytes=row["size_bytes"],
        created_at=row["created_at"],
    )


def event_row(row: sqlite3.Row) -> EventRecord:
    return EventRecord(
        id=row["id"],
        session_id=row["session_id"],
        type=row["type"],
        message=row["message"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


def agent_message_history_row(row: sqlite3.Row) -> AgentMessageHistoryRecord:
    return AgentMessageHistoryRecord(
        id=row["id"],
        session_id=row["session_id"],
        agent_name=row["agent_name"],
        pydantic_run_id=row["pydantic_run_id"],
        conversation_id=row["conversation_id"],
        messages=json_loads(row["messages_json"]),
        created_at=row["created_at"],
    )
