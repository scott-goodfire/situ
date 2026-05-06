from __future__ import annotations

from uuid import uuid4

import pytest

from situ.harness.api.collections import collection_route_for_record, publish_record_upsert
from situ.harness.core.notifications import (
    register_project_notifications,
    set_project_collections_subscribed,
)
from situ.harness.records import (
    AgentRecord,
    AnalysisActivityRecord,
    AnalysisRecord,
    ArtifactRecord,
    BaselineRecord,
    EventRecord,
    EvaluationActivityRecord,
    EvaluationRecord,
    ExperimentActivityRecord,
    ExperimentRecord,
    HypothesisActivityRecord,
    HypothesisExperimentLinkRecord,
    HypothesisRecord,
    MeasurementRecord,
    ProjectRecord,
    SessionRecord,
    TaskActivityRecord,
    TaskDependencyRecord,
    TaskEntityLinkRecord,
    TaskRecord,
    WorkspaceRecord,
)


class _NonCollectionRecord:
    pass


def test_collection_routes_cover_publishable_records() -> None:
    records = [
        (workspace_record(), "workspaces", "workspace_0001"),
        (project_record(), "projects", "project_0001"),
        (session_record(), "sessions", "session_0001"),
        (hypothesis_record(), "hypotheses", "hyp_0001"),
        (baseline_record(), "baselines", "baseline_0001"),
        (experiment_record(), "experiments", "exp_0001"),
        (evaluation_record(), "evaluations", "eval_0001"),
        (measurement_record(), "measurements", "7"),
        (analysis_record(), "analyses", "analysis_0001"),
        (
            HypothesisExperimentLinkRecord(
                hypothesis_id="hyp_0001",
                experiment_id="exp_0001",
                created_at="now",
            ),
            "hypothesis_experiment_links",
            "hyp_0001:exp_0001",
        ),
        (agent_record(), "agents", "agent_0001"),
        (task_record(), "tasks", "task_0001"),
        (
            task_dependency_record(),
            "task_dependencies",
            "task_0002:task_0001",
        ),
        (
            task_entity_link_record(),
            "task_entity_links",
            "task_0001:evaluation:eval_0001:created",
        ),
        (task_activity_record(), "task_activities", "5"),
        (analysis_activity_record(), "analysis_activities", "6"),
        (hypothesis_activity_record(), "hypothesis_activities", "1"),
        (experiment_activity_record(), "experiment_activities", "2"),
        (evaluation_activity_record(), "evaluation_activities", "4"),
        (artifact_record(), "artifacts", "artifact_0001"),
        (event_record(), "events", "3"),
    ]

    for record, collection, key in records:
        route = collection_route_for_record(record)
        assert route.collection == collection
        assert route.key(record) == key


def test_collection_publisher_emits_generic_upsert() -> None:
    project_id = f"project_{uuid4().hex}"
    notifications: list[tuple[str, dict]] = []
    register_project_notifications(
        project_id,
        lambda method, params: notifications.append((method, params)),
    )
    set_project_collections_subscribed(project_id, True)

    publish_record_upsert(
        project_id=project_id,
        record=project_record(),
        cursor=42,
    )

    assert notifications == [
        (
            "collections.upserted",
            {
                "cursor": 42,
                "collection": "projects",
                "key": "project_0001",
                "record": project_record().model_dump(),
            },
        )
    ]


def test_collection_route_rejects_non_collection_records() -> None:
    with pytest.raises(TypeError, match="not publishable"):
        collection_route_for_record(_NonCollectionRecord())  # type: ignore[arg-type]


def workspace_record() -> WorkspaceRecord:
    return WorkspaceRecord(
        id="workspace_0001",
        repo_path="/tmp/project",
        created_at="now",
        updated_at="now",
    )


def project_record() -> ProjectRecord:
    return ProjectRecord(
        id="project_0001",
        workspace_id="workspace_0001",
        title="Improve score",
        objective="Improve score.",
        research_context="Run evals. Expected signals: score.",
        status="active",
        created_at="now",
        updated_at="now",
    )


def session_record() -> SessionRecord:
    return SessionRecord(
        id="session_0001",
        workspace_id="workspace_0001",
        project_id="project_0001",
        status="active",
        created_at="now",
        updated_at="now",
    )


def agent_record() -> AgentRecord:
    return AgentRecord(
        id="agent_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        kind="scientist",
        display_name="Scientist",
        model_name="openai:test",
        status="idle",
        created_at="now",
        updated_at="now",
    )


def task_record() -> TaskRecord:
    return TaskRecord(
        id="task_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        title="Run baseline",
        content="Run the baseline eval and record evidence.",
        kind="baseline",
        status="backlog",
        priority="high",
        source_kind="manager",
        assignee_id=None,
        parent_task_id=None,
        payload={},
        pydantic_run_id=None,
        conversation_id=None,
        result_summary=None,
        created_at="now",
        available_at="now",
        claimed_in_session_id=None,
        claimed_at=None,
        completed_in_session_id=None,
        completed_at=None,
        updated_at="now",
    )


def task_dependency_record() -> TaskDependencyRecord:
    return TaskDependencyRecord(
        project_id="project_0001",
        task_id="task_0002",
        blocked_by_task_id="task_0001",
        created_at="now",
    )


def task_entity_link_record() -> TaskEntityLinkRecord:
    return TaskEntityLinkRecord(
        project_id="project_0001",
        task_id="task_0001",
        entity_kind="evaluation",
        entity_id="eval_0001",
        relationship="created",
        created_at="now",
    )


def task_activity_record() -> TaskActivityRecord:
    return TaskActivityRecord(
        id=5,
        project_id="project_0001",
        task_id="task_0001",
        created_in_session_id="session_0001",
        actor_agent_id="agent_0001",
        actor="agent",
        kind="comment",
        body="Task claimed.",
        payload={},
        created_at="now",
    )


def hypothesis_record() -> HypothesisRecord:
    return HypothesisRecord(
        id="hyp_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        title="Hypothesis",
        summary="Summary.",
        status="active",
        created_at="now",
        updated_at="now",
    )


def experiment_record() -> ExperimentRecord:
    return ExperimentRecord(
        id="exp_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        status="active",
        title="Experiment",
        summary="Summary.",
        created_at="now",
        updated_at="now",
    )


def baseline_record() -> BaselineRecord:
    return BaselineRecord(
        id="baseline_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        status="active",
        title="Baseline",
        summary="Reference state.",
        created_at="now",
        updated_at="now",
    )


def evaluation_record() -> EvaluationRecord:
    return EvaluationRecord(
        id="eval_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        status="active",
        title="Baseline eval",
        summary="Run baseline.",
        associated_baseline_id="baseline_0001",
        associated_experiment_id=None,
        created_at="now",
        updated_at="now",
    )


def analysis_record() -> AnalysisRecord:
    return AnalysisRecord(
        id="analysis_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        created_by_agent_id="agent_0001",
        status="active",
        title="Codebase map",
        summary="Mapped the main backend primitives.",
        content="The backend stores project-owned research records.",
        supersedes_analysis_id=None,
        created_at="now",
        updated_at="now",
    )


def analysis_activity_record() -> AnalysisActivityRecord:
    return AnalysisActivityRecord(
        id=6,
        analysis_id="analysis_0001",
        created_in_session_id="session_0001",
        actor="agent",
        kind="comment",
        body="This note should feed hypothesis generation.",
        payload={},
        created_at="now",
    )


def hypothesis_activity_record() -> HypothesisActivityRecord:
    return HypothesisActivityRecord(
        id=1,
        hypothesis_id="hyp_0001",
        created_in_session_id="session_0001",
        actor="agent",
        kind="comment",
        body="Comment.",
        payload={},
        created_at="now",
    )


def experiment_activity_record() -> ExperimentActivityRecord:
    return ExperimentActivityRecord(
        id=2,
        experiment_id="exp_0001",
        created_in_session_id="session_0001",
        actor="agent",
        kind="comment",
        body="Comment.",
        payload={},
        created_at="now",
    )


def evaluation_activity_record() -> EvaluationActivityRecord:
    return EvaluationActivityRecord(
        id=4,
        evaluation_id="eval_0001",
        created_in_session_id="session_0001",
        actor="agent",
        kind="result",
        body="Baseline result.",
        payload={"activity_type": "result"},
        created_at="now",
    )


def measurement_record() -> MeasurementRecord:
    return MeasurementRecord(
        id=7,
        evaluation_id="eval_0001",
        created_in_session_id="session_0001",
        actor="agent",
        body="Baseline result.",
        payload={"activity_type": "result"},
        created_at="now",
    )


def artifact_record() -> ArtifactRecord:
    return ArtifactRecord(
        id="artifact_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        associated_entity_kind="experiment",
        associated_entity_id="exp_0001",
        kind="json",
        title="Raw output",
        path="artifacts/raw.json",
        media_type="application/json",
        size_bytes=10,
        created_at="now",
    )


def event_record() -> EventRecord:
    return EventRecord(
        id=3,
        associated_project_id="project_0001",
        associated_session_id="session_0001",
        type="session.started",
        message="Started session.",
        payload={},
        created_at="now",
    )
