from __future__ import annotations

from pathlib import Path

import pytest
import pytest_asyncio
from situ.harness.api.current_state import CurrentStateService
from situ.harness.api.project_overview import ProjectOverviewService
from situ.harness.api.sessions import SessionsService
from situ.harness.core.db import Database
from situ.harness.records import (
    AnalysisRecord,
    BaselineRecord,
    EvaluationRecord,
    ExperimentRecord,
    HypothesisRecord,
    ProjectRecord,
    SessionRecord,
    MeasurementRecord,
    WorkItemPurpose,
    WorkItemStatus,
    WorkspaceRecord,
)
from situ.harness.repositories import Repositories

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "situ.sqlite",
        workspace_id="workspace_test",
        repo_path="/tmp/project",
    )
    return Repositories.create(db)


async def create_workspace(repos: Repositories) -> WorkspaceRecord:
    return await repos.workspaces.ensure()


async def create_project(
    repos: Repositories,
    project_id: str = "P1",
) -> ProjectRecord:
    workspace = await create_workspace(repos)
    existing = await repos.projects.get(project_id=project_id)
    if existing is not None:
        return existing
    return await repos.projects.create(
        project_id=project_id,
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score without hurting latency.",
        research_context="Run a JSON eval. Expected signals: score, latency_ms.",
    )


async def create_session(
    repos: Repositories,
    session_id: str = "S1",
) -> SessionRecord:
    workspace = await create_workspace(repos)
    project = await create_project(repos)
    existing = await repos.sessions.get(session_id=session_id)
    if existing is not None:
        return existing
    return await repos.sessions.create(
        session_id=session_id,
        workspace_id=workspace.id,
        project_id=project.id,
    )


async def create_hypothesis(repos: Repositories) -> HypothesisRecord:
    project = await create_project(repos)
    session = await create_session(repos)
    existing = await repos.hypotheses.get(hypothesis_id="H1")
    if existing is not None:
        return existing
    return await repos.hypotheses.create(
        hypothesis_id="H1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )


async def create_experiment(
    repos: Repositories,
    experiment_id: str = "EX1",
) -> ExperimentRecord:
    project = await create_project(repos)
    session = await create_session(repos)
    await create_hypothesis(repos)
    existing = await repos.experiments.get(experiment_id=experiment_id)
    if existing is not None:
        return existing
    return await repos.experiments.create(
        experiment_id=experiment_id,
        project_id=project.id,
        created_in_session_id=session.id,
        title="Try component A",
        summary="Apply component A.",
    )


async def create_baseline(
    repos: Repositories,
    baseline_id: str = "B1",
) -> BaselineRecord:
    project = await create_project(repos)
    session = await create_session(repos)
    existing = await repos.baselines.get(baseline_id=baseline_id)
    if existing is not None:
        return existing
    return await repos.baselines.create(
        baseline_id=baseline_id,
        project_id=project.id,
        created_in_session_id=session.id,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )


async def create_evaluation(repos: Repositories) -> EvaluationRecord:
    project = await create_project(repos)
    session = await create_session(repos)
    baseline = await create_baseline(repos)
    return await repos.evaluations.create(
        evaluation_id="EV1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )


async def create_measurement(repos: Repositories) -> MeasurementRecord:
    evaluation = await create_evaluation(repos)
    return await repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result recorded.",
        payload={"metrics": {"score": 0.71}},
    )


async def create_analysis(repos: Repositories) -> AnalysisRecord:
    project = await create_project(repos)
    session = await create_session(repos)
    existing = await repos.analyses.get(analysis_id="A1")
    if existing is not None:
        return existing
    return await repos.analyses.create(
        analysis_id="A1",
        project_id=project.id,
        created_in_session_id=session.id,
        created_by_agent_id=None,
        title="Codebase map",
        summary="Mapped the backend primitives.",
        content="Project-owned records represent durable research state.",
        status="active",
    )


async def test_repositories_generate_canonical_short_ids(repos: Repositories) -> None:
    project = await create_project(repos)
    session = await create_session(repos)

    assert await repos.projects.next_id(workspace_id=project.workspace_id) == "P2"
    assert await repos.sessions.next_id() == "S2"
    assert await repos.analyses.next_id(project_id=project.id) == "A1"
    assert await repos.hypotheses.next_id(project_id=project.id) == "H1"
    assert await repos.baselines.next_id(project_id=project.id) == "B1"
    assert await repos.experiments.next_id(project_id=project.id) == "EX1"
    assert await repos.evaluations.next_id(project_id=project.id) == "EV1"
    assert await repos.artifacts.next_id(project_id=project.id) == "ART1"
    assert await repos.tasks.next_id(project_id=project.id) == "T1"
    assert await repos.work_items.next_id() == "WI1"

    task = await repos.tasks.create(
        task_id=await repos.tasks.next_id(project_id=project.id),
        project_id=project.id,
        created_in_session_id=session.id,
        title="Plan next step",
        content="Review project state and file the next task.",
        kind="plan",
    )

    assert task.id == "T1"
    assert await repos.tasks.next_id(project_id=project.id) == "T2"


async def test_work_items_repository_claims_and_requeues_expired_claims(
    repos: Repositories,
) -> None:
    project = await create_project(repos)
    session = await create_session(repos)
    item = await repos.work_items.ensure_open(
        project_id=project.id,
        created_in_session_id=session.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        target_kind="experiment",
        target_id="EX1",
        payload={"status": "in_review"},
    )

    duplicate = await repos.work_items.ensure_open(
        project_id=project.id,
        created_in_session_id=session.id,
        purpose="critic_review",
        target_kind="experiment",
        target_id="EX1",
    )
    claimed = await repos.work_items.claim_next(
        project_id=project.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        owner_workflow_id="critic-review:S1:T1",
        lease_seconds=60,
    )

    assert duplicate.id == item.id
    assert claimed is not None
    assert claimed.id == item.id
    assert claimed.status == WorkItemStatus.CLAIMED
    assert claimed.owner_workflow_id == "critic-review:S1:T1"
    assert claimed.attempt == 1
    assert claimed.claimed_at is not None
    assert claimed.lease_expires_at is not None

    released = await repos.work_items.release_expired_claims(
        project_id=project.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
    )
    assert released == 0

    await repos.work_items.db.execute(
        "UPDATE work_items SET lease_expires_at = ? WHERE id = ?",
        ("2000-01-01T00:00:00+00:00", item.id),
    )
    released = await repos.work_items.release_expired_claims(
        project_id=project.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
    )
    refreshed = await repos.work_items.get(item_id=item.id)

    assert released == 1
    assert refreshed is not None
    assert refreshed.status == WorkItemStatus.PENDING
    assert refreshed.owner_workflow_id is None
    assert refreshed.claimed_at is None
    assert refreshed.lease_expires_at is None

    reclaimed = await repos.work_items.claim_next(
        project_id=project.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        owner_workflow_id="critic-review:S1:T2",
        lease_seconds=60,
    )

    assert reclaimed is not None
    assert reclaimed.attempt == 2
    assert reclaimed.owner_workflow_id == "critic-review:S1:T2"

    stale_finish = await repos.work_items.finish(
        item_id=item.id,
        owner_workflow_id="critic-review:S1:T1",
    )
    still_claimed = await repos.work_items.get(item_id=item.id)

    assert stale_finish is None
    assert still_claimed is not None
    assert still_claimed.status == WorkItemStatus.CLAIMED
    assert still_claimed.owner_workflow_id == "critic-review:S1:T2"


async def test_work_items_repository_allows_new_item_after_terminal_status(
    repos: Repositories,
) -> None:
    project = await create_project(repos)
    session = await create_session(repos)
    first = await repos.work_items.ensure_open(
        project_id=project.id,
        created_in_session_id=session.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        target_kind="baseline",
        target_id="B1",
    )

    finished = await repos.work_items.finish(item_id=first.id)
    second = await repos.work_items.ensure_open(
        project_id=project.id,
        created_in_session_id=session.id,
        purpose=WorkItemPurpose.CRITIC_REVIEW,
        target_kind="baseline",
        target_id="B1",
    )

    assert finished is not None
    assert finished.status == WorkItemStatus.DONE
    assert finished.completed_at is not None
    assert second.id != first.id
    assert second.status == WorkItemStatus.PENDING


async def test_tasks_repository_requeue_moves_task_back_to_backlog(
    repos: Repositories,
) -> None:
    project = await create_project(repos)
    session = await create_session(repos)
    manager = await repos.agents.ensure_project_agent(
        project_id=project.id,
        created_in_session_id=session.id,
        kind="manager",
        display_name="Manager",
    )
    task = await repos.tasks.create(
        task_id="T1",
        project_id=project.id,
        created_in_session_id=session.id,
        title="Plan next step",
        content="File first work.",
        kind="plan",
        priority="high",
        source_kind="system",
        payload={"reuse_key": "project-next-step", "planning_pass_count": 1},
    )
    claimed = await repos.tasks.claim(
        task_id=task.id,
        agent_id=manager.id,
        eligible_kinds=["plan"],
        claimed_in_session_id=session.id,
    )
    assert claimed is not None
    done = await repos.tasks.update(
        task_id=task.id,
        status="done",
        result_summary="First pass completed.",
        completed_in_session_id=session.id,
    )
    assert done is not None
    assert done.status == "done"

    requeued = await repos.tasks.requeue(
        task_id=task.id,
        content="File the next runnable work.",
        payload={"reuse_key": "project-next-step", "planning_pass_count": 2},
    )

    assert requeued is not None
    assert requeued.id == task.id
    assert requeued.status == "backlog"
    assert requeued.assignee_id is None
    assert requeued.claimed_in_session_id is None
    assert requeued.claimed_at is None
    assert requeued.completed_in_session_id is None
    assert requeued.completed_at is None
    assert requeued.result_summary is None
    assert requeued.content == "File the next runnable work."
    assert requeued.payload["planning_pass_count"] == 2


async def test_workspace_repository_ensure_get_and_idempotent(repos: Repositories) -> None:
    workspace = await create_workspace(repos)

    assert workspace.id == "workspace_test"
    assert workspace.repo_path == "/tmp/project"
    created_at = workspace.created_at

    again = await repos.workspaces.ensure()
    assert again.id == workspace.id
    assert again.created_at == created_at
    assert await repos.workspaces.get() == again


async def test_projects_repository_create_update_get_and_list(repos: Repositories) -> None:
    project = await create_project(repos)

    assert project.id == "P1"
    assert project.workspace_id == "workspace_test"
    assert project.title == "Improve score"
    assert "latency" in project.objective
    assert "score" in project.research_context
    assert project.status == "active"

    updated = await repos.projects.update(
        project_id="P1",
        title="Improve score safely",
        research_context="Refined: focus on score, ignore latency.",
        status="closed",
    )
    assert updated is not None
    assert updated.title == "Improve score safely"
    assert "Refined" in updated.research_context
    assert updated.status == "closed"
    assert await repos.projects.get(project_id="P1") == updated
    assert [item.id for item in await repos.projects.list_all()] == ["P1"]
    assert [item.id for item in await repos.projects.list_for_workspace(workspace_id="workspace_test")] == [
        "P1"
    ]


async def test_sessions_repository_create_update_get_and_list(repos: Repositories) -> None:
    session = await create_session(repos)

    assert session.id == "S1"
    assert session.workspace_id == "workspace_test"
    assert session.project_id == "P1"
    assert session.status == "active"

    projectless = await repos.sessions.create(
        session_id="S2",
        workspace_id="workspace_test",
    )
    assert projectless.project_id is None
    attached = await repos.sessions.update_project(session_id="S2", project_id="P1")
    assert attached is not None
    assert attached.project_id == "P1"

    updated = await repos.sessions.update_status(session_id="S1", status="closed")
    assert updated is not None
    assert updated.status == "closed"
    assert await repos.sessions.get(session_id="S1") == updated
    assert [item.id for item in await repos.sessions.list_for_workspace(workspace_id="workspace_test")] == [
        "S1",
        "S2",
    ]
    assert [item.id for item in await repos.sessions.list_for_project(project_id="P1")] == [
        "S1",
        "S2",
    ]


async def test_hypotheses_repository_create_update_get_and_list(repos: Repositories) -> None:
    hypothesis = await create_hypothesis(repos)

    assert hypothesis.id == "H1"
    assert hypothesis.project_id == "P1"
    assert hypothesis.created_in_session_id == "S1"
    assert hypothesis.status == "active"

    updated = await repos.hypotheses.update(
        hypothesis_id="H1",
        summary="Component A helped in first result.",
        status="done",
    )
    assert updated is not None
    assert updated.summary == "Component A helped in first result."
    assert updated.status == "done"
    assert await repos.hypotheses.get(hypothesis_id="H1") == updated
    assert [item.id for item in await repos.hypotheses.list_for_project(project_id="P1")] == [
        "H1"
    ]
    assert [item.id for item in await repos.hypotheses.list_for_session(session_id="S1")] == [
        "H1"
    ]


async def test_experiments_repository_create_update_get_and_list(repos: Repositories) -> None:
    experiment = await create_experiment(repos)

    assert experiment.id == "EX1"
    assert experiment.project_id == "P1"
    assert experiment.created_in_session_id == "S1"
    assert experiment.status == "triage"
    assert experiment.title == "Try component A"
    assert experiment.worktree_path is None
    assert experiment.base_commit is None
    assert experiment.candidate_commit is None
    assert experiment.parent_experiment_id is None
    assert experiment.research_thread is None

    updated = await repos.experiments.update(
        experiment_id="EX1",
        status="done",
        summary="A improved score.",
        worktree_path="/tmp/worktree/EX1",
        base_commit="abc123",
        candidate_commit="def456",
        research_thread="optimizer",
    )
    assert updated is not None
    assert updated.status == "done"
    assert updated.summary == "A improved score."
    assert updated.worktree_path == "/tmp/worktree/EX1"
    assert updated.base_commit == "abc123"
    assert updated.candidate_commit == "def456"
    assert updated.research_thread == "optimizer"
    assert await repos.experiments.get(experiment_id="EX1") == updated
    assert [item.id for item in await repos.experiments.list_for_project(project_id="P1")] == [
        "EX1"
    ]
    assert [item.id for item in await repos.experiments.list_for_session(session_id="S1")] == [
        "EX1"
    ]

    child = await repos.experiments.create(
        experiment_id="EX2",
        project_id="P1",
        created_in_session_id="S1",
        title="Continue component A",
        summary="Build on the prior candidate.",
        parent_experiment_id="EX1",
        research_thread="optimizer",
        base_commit="def456",
    )
    assert child.parent_experiment_id == "EX1"
    assert child.research_thread == "optimizer"
    assert child.base_commit == "def456"


async def test_baselines_repository_create_update_get_and_list(repos: Repositories) -> None:
    baseline = await create_baseline(repos)

    assert baseline.id == "B1"
    assert baseline.project_id == "P1"
    assert baseline.created_in_session_id == "S1"
    assert baseline.status == "triage"
    assert baseline.title == "Current workspace baseline"

    updated = await repos.baselines.update(
        baseline_id="B1",
        status="done",
        summary="Baseline selected for comparison.",
    )
    assert updated is not None
    assert updated.status == "done"
    assert updated.summary == "Baseline selected for comparison."
    assert await repos.baselines.get(baseline_id="B1") == updated
    assert [item.id for item in await repos.baselines.list_for_project(project_id="P1")] == [
        "B1"
    ]
    assert [item.id for item in await repos.baselines.list_for_session(session_id="S1")] == [
        "B1"
    ]


async def test_evaluations_repository_create_update_get_and_list(repos: Repositories) -> None:
    evaluation = await create_evaluation(repos)

    assert evaluation.id == "EV1"
    assert evaluation.project_id == "P1"
    assert evaluation.created_in_session_id == "S1"
    assert evaluation.status == "triage"
    assert evaluation.title == "Baseline project eval"
    assert evaluation.associated_baseline_id == "B1"
    assert evaluation.associated_experiment_id is None

    await create_experiment(repos)
    updated = await repos.evaluations.update(
        evaluation_id="EV1",
        status="done",
        summary="Baseline result recorded.",
        associated_experiment_id="EX1",
    )
    assert updated is not None
    assert updated.status == "done"
    assert updated.summary == "Baseline result recorded."
    assert updated.associated_baseline_id is None
    assert updated.associated_experiment_id == "EX1"
    assert await repos.evaluations.get(evaluation_id="EV1") == updated
    assert [item.id for item in await repos.evaluations.list_for_project(project_id="P1")] == [
        "EV1"
    ]
    assert [item.id for item in await repos.evaluations.list_for_session(session_id="S1")] == [
        "EV1"
    ]
    assert [item.id for item in await repos.evaluations.list_for_experiment(experiment_id="EX1")] == [
        "EV1"
    ]

    baseline_again = await repos.evaluations.update(
        evaluation_id="EV1",
        associated_baseline_id="B1",
    )
    assert baseline_again is not None
    assert baseline_again.associated_baseline_id == "B1"
    assert baseline_again.associated_experiment_id is None
    assert [item.id for item in await repos.evaluations.list_for_baseline(
        baseline_id="B1"
    )] == ["EV1"]


async def test_analyses_repository_create_update_get_and_list(repos: Repositories) -> None:
    analysis = await create_analysis(repos)

    assert analysis.id == "A1"
    assert analysis.project_id == "P1"
    assert analysis.created_in_session_id == "S1"
    assert analysis.created_by_agent_id is None
    assert analysis.status == "active"
    assert "backend primitives" in analysis.summary

    updated = await repos.analyses.update(
        analysis_id="A1",
        status="done",
        summary="Synthesized codebase map into design constraints.",
        content="The main knobs are repository records, tools, and protocol schemas.",
    )
    assert updated is not None
    assert updated.status == "done"
    assert "design constraints" in updated.summary
    assert await repos.analyses.get(analysis_id="A1") == updated
    assert [item.id for item in await repos.analyses.list_for_project(project_id="P1")] == [
        "A1"
    ]
    assert [item.id for item in await repos.analyses.list_for_session(session_id="S1")] == [
        "A1"
    ]

    superseding = await repos.analyses.create(
        analysis_id="A2",
        project_id="P1",
        created_in_session_id="S1",
        title="Updated codebase map",
        summary="Second pass replaced the first map.",
        content="This note supersedes the initial map.",
        supersedes_analysis_id="A1",
    )
    assert superseding.supersedes_analysis_id == "A1"


async def test_work_repositories_reject_invalid_agent_statuses(
    repos: Repositories,
) -> None:
    await create_experiment(repos)

    with pytest.raises(ValueError, match="invalid experiment status"):
        await repos.experiments.update(
            experiment_id="EX1",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid experiment status"):
        await repos.experiments.create(
            experiment_id="EX2",
            project_id="P1",
            created_in_session_id="S1",
            title="Try component B",
            summary="Apply component B.",
            status="running",
        )

    with pytest.raises(ValueError, match="invalid hypothesis status"):
        await repos.hypotheses.update(
            hypothesis_id="H1",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid evaluation status"):
        await repos.evaluations.create(
            evaluation_id="EV3",
            project_id="P1",
            created_in_session_id="S1",
            title="Bad evaluation",
            summary="This should fail.",
            associated_baseline_id="B1",
            status="running",
        )

    with pytest.raises(ValueError, match="invalid baseline status"):
        await repos.baselines.create(
            baseline_id="B2",
            project_id="P1",
            created_in_session_id="S1",
            title="Bad baseline",
            summary="This should fail.",
            status="running",
        )

    with pytest.raises(ValueError, match="exactly one measured subject"):
        await repos.evaluations.create(
            evaluation_id="EV4",
            project_id="P1",
            created_in_session_id="S1",
            title="No subject",
            summary="This should fail.",
        )

    with pytest.raises(ValueError, match="invalid analysis status"):
        await repos.analyses.create(
            analysis_id="A2",
            project_id="P1",
            created_in_session_id="S1",
            title="Bad analysis",
            summary="This should fail.",
            content="Bad status.",
            status="running",
        )


async def test_core_repositories_reject_invalid_statuses(repos: Repositories) -> None:
    await create_project(repos)

    with pytest.raises(ValueError, match="invalid project status"):
        await repos.projects.update(
            project_id="P1",
            status="completed",
        )

    with pytest.raises(ValueError, match="invalid session status"):
        await repos.sessions.update_status(
            session_id="S1",
            status="completed",
        )


async def test_experiments_repository_accepts_record_status_enum(
    repos: Repositories,
) -> None:
    from situ.harness.records import RecordStatus

    await create_hypothesis(repos)
    experiment = await repos.experiments.create(
        experiment_id="EX2",
        project_id="P1",
        created_in_session_id="S1",
        title="Try component B",
        summary="Apply component B.",
        status=RecordStatus.ACTIVE,
    )

    updated = await repos.experiments.update(
        experiment_id="EX2",
        status=RecordStatus.DONE,
    )

    assert experiment.status == "active"
    assert updated is not None
    assert updated.status == "done"


async def test_hypothesis_experiment_links_repository_create_and_list(
    repos: Repositories,
) -> None:
    await create_experiment(repos)

    link = await repos.hypothesis_experiment_links.create(
        hypothesis_id="H1",
        experiment_id="EX1",
    )

    assert link.hypothesis_id == "H1"
    assert link.experiment_id == "EX1"
    assert await repos.hypothesis_experiment_links.get(
        hypothesis_id="H1",
        experiment_id="EX1",
    ) == link
    assert await repos.hypothesis_experiment_links.list_for_hypothesis(hypothesis_id="H1") == [link]
    assert await repos.hypothesis_experiment_links.list_for_experiment(experiment_id="EX1") == [
        link
    ]


async def test_hypothesis_activities_repository_add_and_list(repos: Repositories) -> None:
    await create_hypothesis(repos)

    activity = await repos.hypothesis_activities.add(
        hypothesis_id="H1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="A looks worth trying.",
        payload={"experiment_id": "EX1"},
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.payload == {"experiment_id": "EX1"}
    assert await repos.hypothesis_activities.list_for_hypothesis(hypothesis_id="H1") == [activity]
    assert await repos.hypothesis_activities.list_for_project(project_id="P1") == [activity]


async def test_experiment_activities_repository_add_and_list(repos: Repositories) -> None:
    await create_experiment(repos)

    activity = await repos.experiment_activities.add(
        experiment_id="EX1",
        created_in_session_id="S1",
        actor="worker",
        kind="comment",
        body="A improved score.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.73}],
        },
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.kind == "comment"
    assert await repos.experiment_activities.list_for_experiment(experiment_id="EX1") == [
        activity
    ]
    assert await repos.experiment_activities.list_for_project(project_id="P1") == [activity]


async def test_evaluation_activities_repository_add_and_list(repos: Repositories) -> None:
    await create_evaluation(repos)

    activity = await repos.evaluation_activities.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="recorded",
        body="Baseline result recorded.",
        payload={"signals": [{"key": "score", "value": 0.71}]},
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.kind == "recorded"
    assert await repos.evaluation_activities.list_for_evaluation(
        evaluation_id="EV1"
    ) == [activity]
    assert await repos.evaluation_activities.list_for_project(project_id="P1") == [activity]

    with pytest.raises(ValueError, match="invalid evaluation activity kind"):
        await repos.evaluation_activities.add(
            evaluation_id="EV1",
            created_in_session_id="S1",
            actor="agent",
            kind="invalid_kind",
            body="This should fail.",
        )


async def test_measurements_repository_add_and_list(repos: Repositories) -> None:
    measurement = await create_measurement(repos)

    assert measurement.id == "M1"
    assert measurement.evaluation_id == "EV1"
    assert measurement.created_in_session_id == "S1"
    assert measurement.actor == "agent"
    assert measurement.payload.metrics["score"].value == 0.71
    assert measurement.model_dump()["payload"] == {
        "metrics": {"score": {"value": 0.71}}
    }
    assert await repos.measurements.list_for_evaluation(evaluation_id="EV1") == [
        measurement
    ]
    assert await repos.measurements.list_for_baseline(baseline_id="B1") == [
        measurement
    ]
    assert await repos.measurements.list_for_project(project_id="P1") == [measurement]
    assert await repos.measurements.list_for_session(session_id="S1") == [measurement]


async def test_analysis_activities_repository_add_and_list(repos: Repositories) -> None:
    await create_analysis(repos)

    activity = await repos.analysis_activities.add(
        analysis_id="A1",
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="This map is ready for hypothesis generation.",
        payload={"source": "initial scan"},
    )

    assert activity.id == 1
    assert activity.created_in_session_id == "S1"
    assert activity.kind == "comment"
    assert activity.payload == {"source": "initial scan"}
    assert await repos.analysis_activities.list_for_analysis(analysis_id="A1") == [activity]
    assert await repos.analysis_activities.list_for_project(project_id="P1") == [activity]


async def test_artifacts_repository_create_and_list(repos: Repositories) -> None:
    await create_experiment(repos)
    activity = await repos.experiment_activities.add(
        experiment_id="EX1",
        actor="worker",
        kind="comment",
        body="A improved score.",
    )

    artifact = await repos.artifacts.create(
        artifact_id="ART1",
        project_id="P1",
        created_in_session_id="S1",
        associated_entity_kind="experiment_activity",
        associated_entity_id=str(activity.id),
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        media_type="application/json",
        size_bytes=120,
    )

    assert artifact.id == "ART1"
    assert artifact.project_id == "P1"
    assert artifact.created_in_session_id == "S1"
    assert artifact.associated_entity_kind == "experiment_activity"
    assert artifact.associated_entity_id == str(activity.id)
    assert await repos.artifacts.get(artifact_id="ART1") == artifact
    assert await repos.artifacts.list_for_project(project_id="P1") == [artifact]
    assert await repos.artifacts.list_for_session(session_id="S1") == [artifact]


async def test_events_repository_add_and_list(repos: Repositories) -> None:
    await create_session(repos)

    event = await repos.events.add(
        event_type="session.started",
        message="Started S1",
        session_id="S1",
        payload={"session_id": "S1"},
    )

    assert event.id == 1
    assert event.type == "session.started"
    assert event.associated_project_id == "P1"
    assert event.associated_session_id == "S1"
    assert event.payload == {"session_id": "S1"}
    assert await repos.events.list_for_session(session_id="S1") == [event]
    assert await repos.events.list_for_project(project_id="P1") == [event]
    assert await repos.events.list_all() == [event]


async def test_agent_message_history_repository_appends_and_reconstructs(
    repos: Repositories,
) -> None:
    await create_session(repos)
    manager = await repos.agents.ensure_session_agent(
        session_id="S1",
        kind="manager",
        display_name="Manager",
    )
    scientist = await repos.agents.ensure_session_agent(
        session_id="S1",
        kind="scientist",
        display_name="Scientist",
    )

    first = await repos.agent_message_history.append_session_messages(
        session_id="S1",
        agent_id=manager.id,
        agent_name="situ-research-planner",
        messages_json=(
            b'[{"kind":"request","run_id":"pydantic_run_1",'
            b'"conversation_id":"conversation_1"}]'
        ),
    )
    second = await repos.agent_message_history.append_session_messages(
        session_id="S1",
        agent_id=scientist.id,
        agent_name="situ-research-planner",
        messages_json='[{"kind":"response","run_id":"pydantic_run_1","conversation_id":"conversation_1"}]',
    )

    assert first.id == 1
    assert first.pydantic_run_id == "pydantic_run_1"
    assert first.conversation_id == "conversation_1"
    assert second.id == 2
    assert await repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_id=manager.id,
    ) == [
        {"kind": "request", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
    ]
    assert await repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_name="situ-research-planner",
    ) == [
        {"kind": "request", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
        {"kind": "response", "run_id": "pydantic_run_1", "conversation_id": "conversation_1"},
    ]


async def test_agent_message_history_repository_allows_uncapped_replay(
    repos: Repositories,
) -> None:
    await create_session(repos)
    manager = await repos.agents.ensure_session_agent(
        session_id="S1",
        kind="manager",
        display_name="Manager",
    )
    for index in range(3):
        await repos.agent_message_history.append_session_messages(
            session_id="S1",
            agent_id=manager.id,
            agent_name="situ-manager-agent",
            messages_json=f'[{{"kind":"request","content":"turn-{index}"}}]',
        )

    assert await repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_id=manager.id,
    ) == [
        {"kind": "request", "content": "turn-1"},
        {"kind": "request", "content": "turn-2"},
    ]
    assert await repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_id=manager.id,
        record_cap=None,
    ) == [
        {"kind": "request", "content": "turn-0"},
        {"kind": "request", "content": "turn-1"},
        {"kind": "request", "content": "turn-2"},
    ]
    assert await repos.agent_message_history.get_message_history(
        project_or_session_id="S1",
        agent_id=manager.id,
        record_cap=1,
    ) == [{"kind": "request", "content": "turn-2"}]


async def test_current_state_api_composes_protocol_shaped_state(repos: Repositories) -> None:
    await create_experiment(repos)
    analysis = await create_analysis(repos)
    await repos.hypothesis_experiment_links.create(
        hypothesis_id="H1",
        experiment_id="EX1",
    )
    await repos.experiment_activities.add(
        experiment_id="EX1",
        actor="worker",
        kind="comment",
        body="A improved score.",
        payload={
            "activity_type": "result",
            "signals": [{"key": "score", "value": 0.73}],
        },
    )
    await repos.analysis_activities.add(
        analysis_id=analysis.id,
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Mapped the codebase.",
    )
    baseline = await create_baseline(repos)
    await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )
    await repos.measurements.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result recorded.",
        payload={"activity_type": "result"},
    )
    await repos.evaluation_activities.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="recorded",
        body="Baseline result recorded.",
        payload={"activity_type": "recorded"},
    )
    await repos.events.add(
        event_type="experiment.completed",
        message="Completed EX1",
        session_id="S1",
        payload={"experiment_id": "EX1"},
    )

    current_state = await CurrentStateService(repos=repos).get()
    assert current_state.workspace is not None
    assert current_state.workspace.id == "workspace_test"
    assert [project.id for project in current_state.projects] == ["P1"]
    assert [session.id for session in current_state.sessions] == ["S1"]
    assert [hypothesis.id for hypothesis in current_state.hypotheses] == ["H1"]
    assert [baseline.id for baseline in current_state.baselines] == [
        "B1"
    ]
    assert [experiment.id for experiment in current_state.experiments] == [
        "EX1"
    ]
    assert [evaluation.id for evaluation in current_state.evaluations] == [
        "EV1"
    ]
    assert [analysis.id for analysis in current_state.analyses] == ["A1"]
    assert [measurement.id for measurement in current_state.measurements] == ["M1"]
    assert [activity.kind for activity in current_state.analysis_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in current_state.experiment_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in current_state.evaluation_activities] == [
        "recorded"
    ]
    assert [event.type for event in current_state.events] == ["experiment.completed"]


async def test_project_overview_api_composes_project_overview(repos: Repositories) -> None:
    await create_experiment(repos)
    analysis = await create_analysis(repos)
    await repos.hypothesis_experiment_links.create(
        hypothesis_id="H1",
        experiment_id="EX1",
    )
    await repos.hypothesis_activities.add(
        hypothesis_id="H1",
        actor="agent",
        kind="comment",
        body="A is active.",
    )
    await repos.analysis_activities.add(
        analysis_id=analysis.id,
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Mapped the codebase.",
    )
    await repos.experiment_activities.add(
        experiment_id="EX1",
        actor="worker",
        kind="comment",
        body="A improved score.",
    )
    baseline = await create_baseline(repos)
    await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Baseline project eval",
        summary="Run the baseline project evaluation.",
        associated_baseline_id=baseline.id,
    )
    await repos.measurements.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        body="Baseline result recorded.",
    )
    await repos.evaluation_activities.add(
        evaluation_id="EV1",
        created_in_session_id="S1",
        actor="agent",
        kind="recorded",
        body="Baseline result recorded.",
    )

    graph = await ProjectOverviewService(repos=repos).get_project_overview(session_id="S1")

    assert graph.workspace is not None
    assert graph.workspace.id == "workspace_test"
    assert graph.project is not None
    assert graph.project.id == "P1"
    assert graph.session is not None
    assert graph.session.id == "S1"
    assert graph.summary.session_elapsed is not None
    assert graph.summary.record_counts["experiments"]["total"] == 1
    assert graph.summary.record_counts["measurements"]["total"] == 1
    assert graph.summary.review_counts == {
        "triage_records": 3,
        "in_review_records": 0,
        "pending_critic_records": 3,
    }
    assert [hypothesis.id for hypothesis in graph.hypotheses] == ["H1"]
    assert [baseline.id for baseline in graph.baselines] == [
        "B1"
    ]
    assert [experiment.id for experiment in graph.experiments] == [
        "EX1"
    ]
    assert [evaluation.id for evaluation in graph.evaluations] == [
        "EV1"
    ]
    assert [analysis.id for analysis in graph.analyses] == ["A1"]
    assert [measurement.id for measurement in graph.measurements] == ["M1"]
    assert [activity.kind for activity in graph.analysis_activities] == ["comment"]
    assert [activity.kind for activity in graph.experiment_activities] == [
        "comment"
    ]
    assert [activity.kind for activity in graph.evaluation_activities] == [
        "recorded"
    ]
