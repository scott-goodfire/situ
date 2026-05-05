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
    ProjectRecord,
    ResearchContextRecord,
    SessionRecord,
)


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def json_dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True)


def json_loads(value: str) -> Any:
    return json.loads(value)


def project_row(row: sqlite3.Row) -> ProjectRecord:
    return ProjectRecord(
        id=row["id"],
        repo_path=row["repo_path"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def objective_row(row: sqlite3.Row) -> ObjectiveRecord:
    return ObjectiveRecord(
        id=row["id"],
        session_id=row["session_id"],
        title=row["title"],
        description=row["description"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def research_context_row(row: sqlite3.Row) -> ResearchContextRecord:
    return ResearchContextRecord(
        id=row["id"],
        session_id=row["session_id"],
        body=row["body"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def session_row(row: sqlite3.Row) -> SessionRecord:
    return SessionRecord(
        id=row["id"],
        project_id=row["project_id"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def hypothesis_row(row: sqlite3.Row) -> HypothesisRecord:
    return HypothesisRecord(
        id=row["id"],
        session_id=row["session_id"],
        title=row["title"],
        summary=row["summary"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def experiment_row(row: sqlite3.Row) -> ExperimentRecord:
    return ExperimentRecord(
        id=row["id"],
        session_id=row["session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def evaluation_row(row: sqlite3.Row) -> EvaluationRecord:
    return EvaluationRecord(
        id=row["id"],
        session_id=row["session_id"],
        status=row["status"],
        title=row["title"],
        summary=row["summary"],
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
        actor=row["actor"],
        kind=row["kind"],
        body=row["body"],
        payload=json_loads(row["payload_json"]),
        created_at=row["created_at"],
    )


def artifact_row(row: sqlite3.Row) -> ArtifactRecord:
    return ArtifactRecord(
        id=row["id"],
        session_id=row["session_id"],
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
