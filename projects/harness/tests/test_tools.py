from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any

import pytest
from pydantic_ai import RunContext
from pydantic_ai.models.test import TestModel
from pydantic_ai.usage import RunUsage

from situ.harness.core.db import Database
from situ.harness.core.workers import WorkerManager
from situ.harness.repositories import Repositories
from situ.harness.tools import build_research_toolset, build_workspace_toolset
from situ.harness.tools.activities import (
    ListAnalysisActivitiesTool,
    ListEvaluationActivitiesTool,
    ListExperimentActivitiesTool,
    ListHypothesisActivitiesTool,
)
from situ.harness.tools.analyses import (
    CreateAnalysisTool,
    ListAnalysesTool,
    UpdateAnalysisTool,
)
from situ.harness.tools.artifacts import CreateArtifactTool, ListArtifactsTool
from situ.harness.tools.baselines import (
    CreateBaselineTool,
    ListBaselinesTool,
    UpdateBaselineTool,
)
from situ.harness.tools.comments import (
    AddAnalysisCommentTool,
    AddExperimentCommentTool,
    AddHypothesisCommentTool,
)
from situ.harness.tools.common import SituToolDeps, invoke_situ_tool_sync
from situ.harness.tools.evaluations import (
    AddEvaluationResultTool,
    CreateEvaluationTool,
    ListEvaluationsTool,
    UpdateEvaluationTool,
)
from situ.harness.tools.experiments import (
    CreateExperimentTool,
    ListExperimentsTool,
    RunExperimentTool,
    UpdateExperimentTool,
)
from situ.harness.tools.hypotheses import (
    CreateHypothesisTool,
    ListHypothesesTool,
    UpdateHypothesisTool,
)
from situ.harness.tools.links import LinkHypothesisExperimentTool
from situ.harness.tools.measurements import ListMeasurementsTool
from situ.harness.tools.projects import (
    ConfirmProjectCloseTool,
    CreateProjectTool,
    GetProjectTool,
    RequestProjectCloseTool,
    UpdateProjectTool,
)
from situ.harness.tools.sessions import GetSessionTool
from situ.harness.tools.tasks import (
    AddTaskCommentTool,
    ClaimTaskTool,
    CreateTaskTool,
    GetTaskBoardTool,
    LinkTaskEntityTool,
    UpdateTaskTool,
)
from situ.harness.tools.workspace_state import InspectWorkspaceStateTool
from situ.protocol import ExperimentRunParams, ExperimentRunResult


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)


@pytest.fixture
def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "situ.sqlite",
        workspace_id="workspace_test",
        repo_path="/tmp/project",
    )
    repositories = Repositories.create(db)
    workspace = repositories.workspaces.ensure()
    project = repositories.projects.create(
        project_id="project_0001",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score without hurting latency.",
        research_context=(
            "Use the available eval scripts and compare score/latency. "
            "Expected signals: score, latency_ms. Baseline, variants, and combinations."
        ),
    )
    repositories.sessions.create(
        "session_0001",
        workspace_id=workspace.id,
        project_id=project.id,
    )
    repositories.hypotheses.create(
        hypothesis_id="hyp_0001",
        project_id=project.id,
        created_in_session_id="session_0001",
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    repositories.experiments.create(
        experiment_id="exp_session_0001_a",
        project_id=project.id,
        created_in_session_id="session_0001",
        title="Try component A",
        summary="Apply component A.",
    )
    return repositories


def test_get_session_tool_reads_current_session_graph(repos: Repositories) -> None:
    deps = SituToolDeps(session_id="session_0001", repos=repos)
    baseline = repos.baselines.create(
        baseline_id="baseline_project_0001_default",
        project_id="project_0001",
        created_in_session_id="session_0001",
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    evaluation = repos.evaluations.create(
        evaluation_id="eval_session_0001_baseline",
        project_id="project_0001",
        created_in_session_id="session_0001",
        title="Baseline project eval",
        summary="Run the normal project test/eval command before changes.",
        associated_baseline_id=baseline.id,
    )
    repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id="session_0001",
        actor="agent",
        body="Baseline command passed.",
    )

    result = invoke_situ_tool_sync(tool=GetSessionTool(), deps=deps)

    assert result.success is True
    assert result.workspace is not None
    assert result.project is not None
    assert result.project["objective"] == "Improve score without hurting latency."
    assert result.session is not None
    assert result.session["id"] == "session_0001"
    assert [hypothesis["id"] for hypothesis in result.hypotheses] == ["hyp_0001"]
    assert [baseline["id"] for baseline in result.baselines] == [
        "baseline_project_0001_default"
    ]
    assert [experiment["id"] for experiment in result.experiments] == [
        "exp_session_0001_a"
    ]
    assert [measurement["evaluation_id"] for measurement in result.measurements] == [
        "eval_session_0001_baseline"
    ]


def test_task_tools_coordinate_claims_comments_and_entity_links(
    repos: Repositories,
) -> None:
    scientist = repos.agents.ensure_session_agent(
        session_id="session_0001",
        kind="scientist",
        display_name="Scientist",
    )
    researcher = repos.agents.ensure_session_agent(
        session_id="session_0001",
        kind="researcher",
        display_name="Researcher",
    )
    scientist_deps = SituToolDeps(
        session_id="session_0001",
        agent_id=scientist.id,
        repos=repos,
    )
    researcher_deps = SituToolDeps(
        session_id="session_0001",
        agent_id=researcher.id,
        repos=repos,
    )

    baseline = invoke_situ_tool_sync(
        tool=CreateTaskTool(),
        deps=scientist_deps,
        title="Establish baseline",
        content="Run the baseline command and record evidence.",
        kind="baseline",
        priority="high",
        source_kind="manager",
    )
    dependent = invoke_situ_tool_sync(
        tool=CreateTaskTool(),
        deps=scientist_deps,
        title="Generate alternatives",
        content="Generate candidate hypotheses after baseline evidence exists.",
        kind="hypothesize",
        priority="urgent",
        source_kind="manager",
        blocked_by_task_ids=[baseline.task["id"]],
    )

    first_claim = invoke_situ_tool_sync(
        tool=ClaimTaskTool(),
        deps=scientist_deps,
    )
    assert first_claim.success is True
    assert first_claim.task is not None
    assert first_claim.task["id"] == baseline.task["id"]

    invoke_situ_tool_sync(
        tool=UpdateTaskTool(),
        deps=scientist_deps,
        task_id=baseline.task["id"],
        status="done",
        result_summary="Baseline evidence recorded.",
    )
    second_claim = invoke_situ_tool_sync(
        tool=ClaimTaskTool(),
        deps=researcher_deps,
    )
    assert second_claim.task is not None
    assert second_claim.task["id"] == dependent.task["id"]

    comment = invoke_situ_tool_sync(
        tool=AddTaskCommentTool(),
        deps=researcher_deps,
        task_id=dependent.task["id"],
        actor_agent_id=researcher.id,
        comment="Claimed after baseline finished.",
    )
    link = invoke_situ_tool_sync(
        tool=LinkTaskEntityTool(),
        deps=researcher_deps,
        task_id=dependent.task["id"],
        entity_kind="hypothesis",
        entity_id="hyp_0001",
        relationship="referenced",
    )
    board = invoke_situ_tool_sync(tool=GetTaskBoardTool(), deps=researcher_deps)

    assert comment.activity is not None
    assert link.link is not None
    assert len(board.tasks) == 2
    assert [dependency["task_id"] for dependency in board.task_dependencies] == [
        dependent.task["id"]
    ]
    assert board.task_entity_links[0]["entity_id"] == "hyp_0001"


def test_get_project_tool_reads_current_session_project(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="session_0001", repos=repos)

    result = invoke_situ_tool_sync(tool=GetProjectTool(), deps=deps)

    assert result.success is True
    assert result.project is not None
    assert result.project["id"] == "project_0001"


def test_create_project_tool_creates_and_attaches_project(repos: Repositories) -> None:
    db = Database(
        repos.projects.db.path.parent / "fresh.sqlite",
        workspace_id="workspace_fresh",
        repo_path="/tmp/fresh",
    )
    fresh = Repositories.create(db)
    workspace = fresh.workspaces.ensure()
    fresh.sessions.create("session_fresh", workspace_id=workspace.id)
    deps = SituToolDeps(session_id="session_fresh", repos=fresh)

    created = invoke_situ_tool_sync(
        tool=CreateProjectTool(),
        deps=deps,
        title="First",
        objective="First objective",
        research_context="Run eval; expected signals: score.",
    )

    assert created.success is True
    assert created.project is not None
    assert created.session is not None
    assert created.session["project_id"] == created.project["id"]
    assert created.project["workspace_id"] == "workspace_fresh"

    updated = invoke_situ_tool_sync(
        tool=UpdateProjectTool(),
        deps=deps,
        research_context="Refined: focus on score, ignore latency.",
    )
    assert updated.success is True
    assert updated.project is not None
    assert "Refined" in updated.project["research_context"]


def test_project_close_requires_request_and_confirmation(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    manager = repos.agents.ensure_project_agent(
        project_id="project_0001",
        created_in_session_id="session_0001",
        kind="manager",
        display_name="Manager",
    )
    plan = repos.tasks.create(
        task_id="task_plan_0001",
        project_id="project_0001",
        created_in_session_id="session_0001",
        title="Plan close",
        content="Decide whether to close.",
        kind="plan",
        priority="high",
        source_kind="manager",
    )
    repos.tasks.claim(
        task_id=plan.id,
        agent_id=manager.id,
        eligible_kinds=["plan"],
        claimed_in_session_id="session_0001",
    )
    deps = SituToolDeps(
        session_id="session_0001",
        agent_id=manager.id,
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    direct_close = invoke_situ_tool_sync(
        tool=UpdateProjectTool(),
        deps=deps,
        status="closed",
    )
    assert direct_close.success is False
    assert direct_close.error is not None
    assert direct_close.error.code == "project_close_requires_confirmation"
    assert "request_project_close" in direct_close.error.message
    assert repos.projects.get("project_0001").status == "active"

    request = invoke_situ_tool_sync(
        tool=RequestProjectCloseTool(),
        deps=deps,
        reason="Current best is sufficient.",
        evidence_summary="Two accepted experiments improved the target metric.",
        remaining_work_assessment="No obvious bounded next task remains.",
    )
    assert request.success is True
    assert request.confirmation_required is True
    assert request.confirmation_code is not None
    assert repos.projects.get("project_0001").status == "active"

    bad_confirm = invoke_situ_tool_sync(
        tool=ConfirmProjectCloseTool(),
        deps=deps,
        confirmation_code="close_project_wrong",
        final_summary="Close anyway.",
    )
    assert bad_confirm.success is False
    assert bad_confirm.error is not None
    assert bad_confirm.error.code == "project_close_confirmation_not_found"

    confirm = invoke_situ_tool_sync(
        tool=ConfirmProjectCloseTool(),
        deps=deps,
        confirmation_code=request.confirmation_code,
        final_summary="Confirmed after reconsidering next work.",
    )
    assert confirm.success is True
    assert confirm.project is not None
    assert confirm.project["status"] == "closed"
    assert [event["type"] for event in emitted] == [
        "project.close_confirmation_required",
        "project.closed",
    ]
    activities = repos.task_activities.list_for_task(plan.id)
    assert [activity.payload["activity_type"] for activity in activities] == [
        "project_close_requested",
        "project_close_confirmed",
    ]


def test_analysis_tools_create_update_list_and_comment(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = invoke_situ_tool_sync(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Codebase map",
        summary="Mapped the backend primitives.",
        content="The main knobs are records, repositories, tools, and protocol schemas.",
    )
    assert created.success is True
    assert created.analysis is not None
    assert created.analysis["id"] == "analysis_project_0001_agent_001"
    assert created.analysis["project_id"] == "project_0001"
    assert created.analysis["created_in_session_id"] == "session_0001"
    assert created.analysis["status"] == "open"

    comment = invoke_situ_tool_sync(
        tool=AddAnalysisCommentTool(),
        deps=deps,
        analysis_id="analysis_project_0001_agent_001",
        comment="This map is ready to feed hypothesis generation.",
        payload={"source": "first pass"},
    )
    assert comment.success is True
    assert comment.activity is not None
    assert comment.activity["kind"] == "comment"
    assert comment.activity["created_in_session_id"] == "session_0001"
    assert comment.activity["payload"] == {"source": "first pass"}

    updated = invoke_situ_tool_sync(
        tool=UpdateAnalysisTool(),
        deps=deps,
        analysis_id="analysis_project_0001_agent_001",
        status="active",
        summary="Synthesized backend map into candidate work.",
    )
    assert updated.success is True
    assert updated.analysis is not None
    assert updated.analysis["status"] == "active"

    listed = invoke_situ_tool_sync(
        tool=ListAnalysesTool(),
        deps=deps,
        status="active",
    )
    activities = invoke_situ_tool_sync(
        tool=ListAnalysisActivitiesTool(),
        deps=deps,
        analysis_id="analysis_project_0001_agent_001",
    )

    assert [analysis["id"] for analysis in listed.analyses] == [
        "analysis_project_0001_agent_001"
    ]
    assert [activity["id"] for activity in activities.activities] == [1]
    assert [event["type"] for event in emitted] == [
        "analysis.created",
        "analysis.comment_added",
        "analysis.updated",
    ]


def test_hypothesis_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = invoke_situ_tool_sync(
        tool=CreateHypothesisTool(),
        deps=deps,
        title="Component C helps",
        summary="Component C may combine with A.",
    )
    assert created.success is True
    assert created.hypothesis is not None
    assert created.hypothesis["id"] == "hyp_project_0001_agent_002"
    assert created.hypothesis["project_id"] == "project_0001"
    assert created.hypothesis["created_in_session_id"] == "session_0001"
    assert created.hypothesis["status"] == "open"

    updated = invoke_situ_tool_sync(
        tool=UpdateHypothesisTool(),
        deps=deps,
        hypothesis_id="hyp_project_0001_agent_002",
        status="active",
        summary="Component C is ready to test.",
    )
    assert updated.success is True
    assert updated.hypothesis is not None
    assert updated.hypothesis["status"] == "active"

    listed = invoke_situ_tool_sync(
        tool=ListHypothesesTool(),
        deps=deps,
        status="active",
    )
    assert listed.success is True
    assert [hypothesis["id"] for hypothesis in listed.hypotheses] == [
        "hyp_0001",
        "hyp_project_0001_agent_002",
    ]
    assert [event["type"] for event in emitted] == [
        "hypothesis.created",
        "hypothesis.updated",
    ]


def test_experiment_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = invoke_situ_tool_sync(
        tool=CreateExperimentTool(),
        deps=deps,
        title="Try component C",
        summary="Apply component C independently.",
    )
    assert created.success is True
    assert created.experiment is not None
    assert created.experiment["id"] == "exp_project_0001_agent_002"
    assert created.experiment["project_id"] == "project_0001"
    assert created.experiment["created_in_session_id"] == "session_0001"
    assert created.experiment["status"] == "open"

    updated = invoke_situ_tool_sync(
        tool=UpdateExperimentTool(),
        deps=deps,
        experiment_id="exp_project_0001_agent_002",
        status="closed",
        summary="Component C improved score but hurt latency.",
    )
    assert updated.success is True
    assert updated.experiment is not None
    assert updated.experiment["status"] == "closed"

    listed = invoke_situ_tool_sync(tool=ListExperimentsTool(), deps=deps)
    assert listed.success is True
    assert [experiment["id"] for experiment in listed.experiments] == [
        "exp_session_0001_a",
        "exp_project_0001_agent_002",
    ]
    assert [event["type"] for event in emitted] == [
        "experiment.created",
        "experiment.updated",
    ]


def test_baseline_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = invoke_situ_tool_sync(
        tool=CreateBaselineTool(),
        deps=deps,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    assert created.success is True
    assert created.baseline is not None
    assert created.baseline["id"] == "baseline_project_0001_agent_001"
    assert created.baseline["project_id"] == "project_0001"
    assert created.baseline["created_in_session_id"] == "session_0001"
    assert created.baseline["status"] == "open"

    updated = invoke_situ_tool_sync(
        tool=UpdateBaselineTool(),
        deps=deps,
        baseline_id="baseline_project_0001_agent_001",
        status="closed",
        summary="Baseline accepted for comparison.",
    )
    assert updated.success is True
    assert updated.baseline is not None
    assert updated.baseline["status"] == "closed"

    listed = invoke_situ_tool_sync(tool=ListBaselinesTool(), deps=deps)
    assert listed.success is True
    assert [baseline["id"] for baseline in listed.baselines] == [
        "baseline_project_0001_agent_001"
    ]
    assert [event["type"] for event in emitted] == [
        "baseline.created",
        "baseline.updated",
    ]


def test_evaluation_tools_create_update_list_and_add_results(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )
    baseline = invoke_situ_tool_sync(
        tool=CreateBaselineTool(),
        deps=deps,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    assert baseline.baseline is not None

    created = invoke_situ_tool_sync(
        tool=CreateEvaluationTool(),
        deps=deps,
        title="Baseline project eval",
        summary="Run the normal project test/eval command before changes.",
        associated_baseline_id=baseline.baseline["id"],
    )
    assert created.success is True
    assert created.evaluation is not None
    assert created.evaluation["id"] == "eval_project_0001_agent_001"
    assert created.evaluation["project_id"] == "project_0001"
    assert created.evaluation["created_in_session_id"] == "session_0001"
    assert created.evaluation["status"] == "open"
    assert created.evaluation["associated_baseline_id"] == baseline.baseline["id"]

    result = invoke_situ_tool_sync(
        tool=AddEvaluationResultTool(),
        deps=deps,
        evaluation_id="eval_project_0001_agent_001",
        result="Baseline command passed with score 0.71.",
        payload={"raw": "score=0.71", "metrics": {"score": 0.71}},
    )
    assert result.success is True
    assert result.measurement is not None
    assert result.measurement["body"] == "Baseline command passed with score 0.71."
    assert result.measurement["payload"]["activity_type"] == "result"
    assert result.measurement["payload"]["metrics"] == {
        "score": {"value": 0.71}
    }
    assert result.activity is not None
    assert result.activity["kind"] == "result"
    assert result.activity["body"] == "Baseline command passed with score 0.71."
    assert result.activity["payload"]["activity_type"] == "result"
    assert result.activity["payload"]["measurement_id"] == result.measurement["id"]

    updated = invoke_situ_tool_sync(
        tool=UpdateEvaluationTool(),
        deps=deps,
        evaluation_id="eval_project_0001_agent_001",
        status="closed",
        summary="Baseline result recorded.",
    )
    assert updated.success is True
    assert updated.evaluation is not None
    assert updated.evaluation["status"] == "closed"

    listed = invoke_situ_tool_sync(tool=ListEvaluationsTool(), deps=deps)
    listed_measurements = invoke_situ_tool_sync(
        tool=ListMeasurementsTool(),
        deps=deps,
        baseline_id=baseline.baseline["id"],
    )
    activities = invoke_situ_tool_sync(
        tool=ListEvaluationActivitiesTool(),
        deps=deps,
        evaluation_id="eval_project_0001_agent_001",
    )
    measurements = repos.measurements.list_for_evaluation("eval_project_0001_agent_001")

    assert listed.success is True
    assert [evaluation["id"] for evaluation in listed.evaluations] == [
        "eval_project_0001_agent_001"
    ]
    assert [measurement["id"] for measurement in listed_measurements.measurements] == [
        1
    ]
    assert [measurement.id for measurement in measurements] == [1]
    assert [activity["id"] for activity in activities.activities] == [1]
    assert [event["type"] for event in emitted] == [
        "baseline.created",
        "evaluation.created",
        "evaluation.result_added",
        "evaluation.updated",
    ]


def test_work_tools_reject_invalid_statuses_with_agent_readable_errors(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="session_0001", repos=repos)

    experiment_update = invoke_situ_tool_sync(
        tool=UpdateExperimentTool(),
        deps=deps,
        experiment_id="exp_session_0001_a",
        status="completed",
    )
    hypothesis_update = invoke_situ_tool_sync(
        tool=UpdateHypothesisTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
        status="completed",
    )
    experiment_list = invoke_situ_tool_sync(
        tool=ListExperimentsTool(),
        deps=deps,
        status="completed",
    )
    evaluation_list = invoke_situ_tool_sync(
        tool=ListEvaluationsTool(),
        deps=deps,
        status="completed",
    )
    analysis_list = invoke_situ_tool_sync(
        tool=ListAnalysesTool(),
        deps=deps,
        status="completed",
    )

    assert experiment_update.success is False
    assert experiment_update.error is not None
    assert "invalid experiment status: 'completed'" in experiment_update.error.message
    assert "'open', 'active', 'closed'" in experiment_update.error.message
    assert "comment instead" in experiment_update.error.message

    assert hypothesis_update.success is False
    assert hypothesis_update.error is not None
    assert "invalid hypothesis status: 'completed'" in hypothesis_update.error.message

    assert experiment_list.success is False
    assert experiment_list.error is not None
    assert "invalid experiment status: 'completed'" in experiment_list.error.message

    assert evaluation_list.success is False
    assert evaluation_list.error is not None
    assert "invalid evaluation status: 'completed'" in evaluation_list.error.message

    assert analysis_list.success is False
    assert analysis_list.error is not None
    assert "invalid analysis status: 'completed'" in analysis_list.error.message


def test_link_tool_links_hypothesis_and_experiment(repos: Repositories) -> None:
    deps = SituToolDeps(session_id="session_0001", repos=repos)

    result = invoke_situ_tool_sync(
        tool=LinkHypothesisExperimentTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
        experiment_id="exp_session_0001_a",
    )

    assert result.success is True
    assert result.link is not None
    assert result.link["hypothesis_id"] == "hyp_0001"
    assert result.link["experiment_id"] == "exp_session_0001_a"


def test_comment_tools_write_activity_records(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    hypothesis_comment = invoke_situ_tool_sync(
        tool=AddHypothesisCommentTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
        comment="Component A is promising enough to test.",
        payload={"reason": "first pass"},
    )
    experiment_comment = invoke_situ_tool_sync(
        tool=AddExperimentCommentTool(),
        deps=deps,
        experiment_id="exp_session_0001_a",
        comment="Component A improved score.",
        payload={"signals": [{"key": "score", "value": 0.73}]},
    )

    assert hypothesis_comment.success is True
    assert hypothesis_comment.activity is not None
    assert hypothesis_comment.activity["kind"] == "comment"
    assert hypothesis_comment.activity["created_in_session_id"] == "session_0001"
    assert hypothesis_comment.activity["body"] == "Component A is promising enough to test."
    assert experiment_comment.success is True
    assert experiment_comment.activity is not None
    assert experiment_comment.activity["kind"] == "comment"
    assert experiment_comment.activity["created_in_session_id"] == "session_0001"
    assert experiment_comment.activity["body"] == "Component A improved score."

    hypothesis_activities = invoke_situ_tool_sync(
        tool=ListHypothesisActivitiesTool(),
        deps=deps,
        hypothesis_id="hyp_0001",
    )
    experiment_activities = invoke_situ_tool_sync(
        tool=ListExperimentActivitiesTool(),
        deps=deps,
        experiment_id="exp_session_0001_a",
    )

    assert [activity["id"] for activity in hypothesis_activities.activities] == [1]
    assert [activity["id"] for activity in experiment_activities.activities] == [1]
    assert [event["type"] for event in emitted] == [
        "hypothesis.comment_added",
        "experiment.comment_added",
    ]


def test_artifact_tools_create_and_list_artifacts(repos: Repositories) -> None:
    deps = SituToolDeps(session_id="session_0001", repos=repos)

    created = invoke_situ_tool_sync(
        tool=CreateArtifactTool(),
        deps=deps,
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        associated_entity_kind="experiment",
        associated_entity_id="exp_session_0001_a",
        media_type="application/json",
        size_bytes=120,
    )
    assert created.success is True
    assert created.artifact is not None
    assert created.artifact["id"] == "artifact_project_0001_001"
    assert created.artifact["project_id"] == "project_0001"
    assert created.artifact["created_in_session_id"] == "session_0001"
    assert created.artifact["associated_entity_kind"] == "experiment"
    assert created.artifact["associated_entity_id"] == "exp_session_0001_a"

    listed = invoke_situ_tool_sync(
        tool=ListArtifactsTool(),
        deps=deps,
        associated_entity_kind="experiment",
        associated_entity_id="exp_session_0001_a",
    )
    assert listed.success is True
    assert [artifact["id"] for artifact in listed.artifacts] == [
        "artifact_project_0001_001"
    ]


def test_workspace_toolset_uses_repo_path_backend(tmp_path: Path) -> None:
    marker = tmp_path / "marker.txt"
    marker.write_text("workspace marker", encoding="utf-8")
    deps = SituToolDeps(session_id="session_0001", repo_path=str(tmp_path))

    result = deps.backend.execute(
        "pwd && printf '\\n---\\n' && cat marker.txt",
        timeout=5,
    )
    toolset = build_workspace_toolset()
    execute_output = asyncio.run(
        _call_workspace_execute(
            toolset=toolset,
            deps=deps,
        )
    )

    assert result.exit_code == 0
    assert str(tmp_path) in result.output
    assert "workspace marker" in result.output
    assert "workspace-toolset" in execute_output
    expected_tools = {
        "ls",
        "read_file",
        "write_file",
        "edit_file",
        "glob",
        "grep",
        "execute",
    }
    assert expected_tools.issubset(set(toolset.tools))


def test_research_toolset_includes_workspace_state_inspector() -> None:
    toolset = build_research_toolset()

    assert "inspect_workspace_state" in toolset.tools


def test_inspect_workspace_state_classifies_candidate_changes(tmp_path: Path) -> None:
    _git(tmp_path, "init")
    _git(tmp_path, "config", "user.email", "situ@example.com")
    _git(tmp_path, "config", "user.name", "Situ")
    (tmp_path / "micrograd").mkdir()
    (tmp_path / "test").mkdir()
    (tmp_path / "micrograd" / "engine.py").write_text(
        "class Value: pass\n",
        encoding="utf-8",
    )
    (tmp_path / "test" / "test_engine.py").write_text(
        "def test_ok(): pass\n",
        encoding="utf-8",
    )
    _git(tmp_path, "add", ".")
    _git(tmp_path, "commit", "-m", "baseline")

    (tmp_path / "micrograd" / "engine.py").write_text(
        "class Value:\n    def tanh(self): pass\n",
        encoding="utf-8",
    )
    (tmp_path / "test" / "test_engine.py").write_text(
        "def test_ok(): pass\ndef test_tanh(): pass\n",
        encoding="utf-8",
    )
    (tmp_path / "pyproject.toml").write_text(
        "[project]\nname = 'demo'\n",
        encoding="utf-8",
    )
    (tmp_path / ".pytest_cache").mkdir()
    (tmp_path / ".pytest_cache" / "README.md").write_text("cache\n", encoding="utf-8")

    deps = SituToolDeps(session_id="session_0001", repo_path=str(tmp_path))

    inspected = invoke_situ_tool_sync(
        tool=InspectWorkspaceStateTool(),
        deps=deps,
        eval_command=".venv/bin/python -m pytest",
    )

    assert inspected.success is True
    assert inspected.workspace_state is not None
    assert inspected.workspace_state["dirty"] is True
    assert inspected.workspace_state["eval_command"] == ".venv/bin/python -m pytest"
    assert inspected.workspace_state["category_counts"] == {
        "source": 1,
        "test_or_eval": 1,
        "dependency": 1,
        "generated": 1,
    }
    assert (
        "Candidate changes include tests, evals, benchmarks, or fixtures."
        in inspected.workspace_state["concerns"]
    )
    assert (
        "Candidate changes include dependency or toolchain files."
        in inspected.workspace_state["concerns"]
    )
    assert (
        "Candidate changes include generated or cache files."
        in inspected.workspace_state["concerns"]
    )


async def _call_workspace_execute(
    *,
    toolset: Any,
    deps: SituToolDeps,
) -> str:
    ctx = RunContext(
        deps=deps,
        model=TestModel(),
        usage=RunUsage(),
    )
    tools = await toolset.get_tools(ctx)
    result = await toolset.call_tool(
        "execute",
        {"command": "printf workspace-toolset", "timeout": 5},
        ctx,
        tools["execute"],
    )
    return str(result)


def test_run_experiment_tool_executes_worker_and_records_activity(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        worker_manager=FakeWorkerManager(),
        emit_event=_event_collector(emitted),
    )

    result = invoke_situ_tool_sync(
        tool=RunExperimentTool(),
        deps=deps,
        title="Try component C",
        summary="Run component C and capture score.",
        components=["C"],
    )

    assert result.success is True
    assert result.experiment is not None
    assert result.experiment["status"] == "closed"
    assert result.result is not None
    assert result.result["status"] == "completed"
    assert result.concerns == []
    activities = repos.experiment_activities.list_for_experiment(result.experiment["id"])
    assert [activity.payload.get("activity_type") for activity in activities] == [
        "plan",
        "result",
    ]
    assert "worker.progress" in [event["type"] for event in emitted]


def test_create_experiment_tool_reuses_active_experiment_context(
    repos: Repositories,
) -> None:
    existing = repos.experiments.update(
        "exp_session_0001_a",
        status="active",
        worktree_path="/tmp/situ-worktree",
        base_commit="abc123",
    )
    assert existing is not None
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="session_0001",
        repos=repos,
        active_experiment_id=existing.id,
        emit_event=_event_collector(emitted),
    )

    result = invoke_situ_tool_sync(
        tool=CreateExperimentTool(),
        deps=deps,
        title="Refine existing candidate",
        summary="Use the active experiment checkout.",
    )

    assert result.success is True
    assert result.experiment is not None
    assert result.experiment["id"] == existing.id
    assert result.experiment["status"] == "active"
    assert result.experiment["worktree_path"] == "/tmp/situ-worktree"
    assert len(repos.experiments.list_for_project("project_0001")) == 1
    assert "experiment.updated" in [event["type"] for event in emitted]


class FakeWorkerManager(WorkerManager):
    def __init__(self) -> None:
        pass

    def run_experiment(
        self,
        params: ExperimentRunParams,
        on_progress: Any,
    ) -> ExperimentRunResult:
        on_progress(
            {
                "params": {
                    "session_id": params.session_id,
                    "experiment_id": params.experiment_id,
                    "message": "fake worker progress",
                }
            }
        )
        return ExperimentRunResult(
            experiment_id=params.experiment_id,
            status="completed",
            summary="Component C produced a score.",
            signals=[{"key": "score", "value": 0.72}],
            raw={"shape": "standard"},
        )


def _event_collector(
    emitted: list[dict[str, Any]],
) -> Any:
    def emit_event(
        event_type: str,
        message: str,
        associated_project_id: str | None,
        associated_session_id: str | None,
        payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        event = {
            "type": event_type,
            "message": message,
            "associated_project_id": associated_project_id,
            "associated_session_id": associated_session_id,
            "payload": payload or {},
        }
        emitted.append(event)
        return event

    return emit_event
