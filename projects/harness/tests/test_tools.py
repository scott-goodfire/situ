from __future__ import annotations

from dataclasses import dataclass
import json
import subprocess
from pathlib import Path
from typing import Any, cast

import pytest
import pytest_asyncio
from pydantic_ai import RunContext
from pydantic_ai.models.test import TestModel
from pydantic_ai.usage import RunUsage

from situ.harness.core.db import Database
from situ.harness.core.workers import WorkerManager
from situ.harness.repositories import Repositories
from situ.harness.tools import build_scientist_toolset, build_workspace_toolset
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
from situ.harness.tools.analysis_activities import AddAnalysisCommentTool
from situ.harness.tools.common import BaseSituTool, SituToolDeps
from situ.harness.tools.evaluations import (
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
from situ.harness.tools.experiment_activities import (
    AddExperimentCommentTool,
    AddExperimentLineageDecisionTool,
    AddExperimentReviewTool,
)
from situ.harness.tools.hypotheses import (
    CreateHypothesisTool,
    ListHypothesesTool,
    ResolveHypothesisTool,
    UpdateHypothesisTool,
)
from situ.harness.tools.hypothesis_activities import AddHypothesisCommentTool
from situ.harness.tools.links import LinkHypothesisExperimentTool
from situ.harness.tools.measurements import (
    AddMeasurementTool,
    ListMeasurementsTool,
)
from situ.harness.tools.projects import (
    ConfirmProjectCloseTool,
    CreateProjectTool,
    GetProjectTool,
    RequestProjectCloseTool,
    UpdateProjectTool,
)
from situ.harness.tools.project_overview import GetProjectOverviewTool
from situ.harness.tools.tasks import (
    ClaimTaskTool,
    CreateTaskTool,
    GetTaskTool,
    GetTaskOverviewTool,
    LinkTaskEntityTool,
    UpdateTaskTool,
)
from situ.harness.tools.task_activities import AddTaskCommentTool
from situ.harness.tools.workspace_state import InspectWorkspaceStateTool
from situ.protocol import ExperimentRunParams, ExperimentRunResult

pytestmark = pytest.mark.asyncio


@dataclass(slots=True)
class _DirectToolContext:
    deps: SituToolDeps


async def invoke_situ_tool(
    *,
    tool: BaseSituTool,
    deps: SituToolDeps,
    **kwargs: Any,
) -> Any:
    tool_return = await tool._build_tool_function()(
        cast(Any, _DirectToolContext(deps=deps)),
        **kwargs,
    )
    return tool_return.return_value


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)


@pytest_asyncio.fixture
async def repos(tmp_path: Path) -> Repositories:
    db = Database(
        tmp_path / "situ.sqlite",
        workspace_id="workspace_test",
        repo_path="/tmp/project",
    )
    repositories = Repositories.create(db)
    workspace = await repositories.workspaces.ensure()
    project = await repositories.projects.create(
        project_id="P1",
        workspace_id=workspace.id,
        title="Improve score",
        objective="Improve score without hurting latency.",
        research_context=(
            "Use the available eval scripts and compare score/latency. "
            "Expected signals: score, latency_ms. Baseline, variants, and combinations."
        ),
    )
    await repositories.sessions.create(
        session_id="S1",
        workspace_id=workspace.id,
        project_id=project.id,
    )
    await repositories.hypotheses.create(
        hypothesis_id="H1",
        project_id=project.id,
        created_in_session_id="S1",
        title="Component A helps",
        summary="Component A may improve score.",
        status="active",
    )
    await repositories.experiments.create(
        experiment_id="EX1",
        project_id=project.id,
        created_in_session_id="S1",
        title="Try component A",
        summary="Apply component A.",
    )
    return repositories


async def test_get_project_overview_tool_reads_current_project_overview(repos: Repositories) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    evaluation = await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Baseline project eval",
        summary="Run the normal project test/eval command before changes.",
        associated_baseline_id=baseline.id,
    )
    await repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id="S1",
        actor="agent",
        body="Baseline command passed.",
    )

    result = await invoke_situ_tool(tool=GetProjectOverviewTool(), deps=deps)

    assert result.success is True
    assert result.workspace is not None
    assert result.project is not None
    assert result.project["objective"] == "Improve score without hurting latency."
    assert [hypothesis["id"] for hypothesis in result.hypotheses] == ["H1"]
    assert [baseline["id"] for baseline in result.baselines] == [
        "B1"
    ]
    assert [experiment["id"] for experiment in result.experiments] == [
        "EX1"
    ]
    assert [measurement["evaluation_id"] for measurement in result.measurements] == [
        "EV1"
    ]


async def test_task_tools_coordinate_claims_comments_and_entity_links(
    repos: Repositories,
) -> None:
    scientist = await repos.agents.ensure_session_agent(
        session_id="S1",
        kind="scientist",
        display_name="Scientist",
    )
    researcher = await repos.agents.ensure_session_agent(
        session_id="S1",
        kind="researcher",
        display_name="Researcher",
    )
    scientist_deps = SituToolDeps(
        session_id="S1",
        agent_id=scientist.id,
        repos=repos,
    )
    researcher_deps = SituToolDeps(
        session_id="S1",
        agent_id=researcher.id,
        repos=repos,
    )

    baseline = await invoke_situ_tool(
        tool=CreateTaskTool(),
        deps=scientist_deps,
        title="Establish baseline",
        content="Run the baseline command and record evidence.",
        kind="baseline",
        priority="high",
        source_kind="manager",
    )
    dependent = await invoke_situ_tool(
        tool=CreateTaskTool(),
        deps=scientist_deps,
        title="Generate alternatives",
        content="Generate candidate hypotheses after baseline evidence exists.",
        kind="hypothesize",
        priority="urgent",
        source_kind="manager",
        blocked_by_task_ids=[baseline.task["id"]],
    )

    first_claim = await invoke_situ_tool(
        tool=ClaimTaskTool(),
        deps=scientist_deps,
    )
    assert first_claim.success is True
    assert first_claim.task is not None
    assert first_claim.task["id"] == baseline.task["id"]

    await invoke_situ_tool(
        tool=UpdateTaskTool(),
        deps=scientist_deps,
        task_id=baseline.task["id"],
        status="done",
        result_summary="Baseline evidence recorded.",
    )
    second_claim = await invoke_situ_tool(
        tool=ClaimTaskTool(),
        deps=researcher_deps,
    )
    assert second_claim.task is not None
    assert second_claim.task["id"] == dependent.task["id"]

    comment = await invoke_situ_tool(
        tool=AddTaskCommentTool(),
        deps=researcher_deps,
        task_id=dependent.task["id"],
        actor_agent_id=researcher.id,
        comment="Claimed after baseline finished.",
    )
    link = await invoke_situ_tool(
        tool=LinkTaskEntityTool(),
        deps=researcher_deps,
        task_id=dependent.task["id"],
        entity_kind="hypothesis",
        entity_id="H1",
        relationship="referenced",
    )
    board = await invoke_situ_tool(tool=GetTaskOverviewTool(), deps=researcher_deps)

    assert comment.activity is not None
    assert link.link is not None
    assert len(board.tasks) == 2
    assert [dependency["task_id"] for dependency in board.task_dependencies] == [
        dependent.task["id"]
    ]
    assert board.task_entity_links[0]["entity_id"] == "H1"

    task_detail = await invoke_situ_tool(
        tool=GetTaskTool(),
        deps=researcher_deps,
        task_id=dependent.task["id"],
    )
    assert task_detail.success is True
    assert task_detail.task is not None
    assert task_detail.task["content"].startswith("Generate candidate")
    assert task_detail.task_dependencies[0]["blocked_by_task_id"] == baseline.task["id"]
    assert task_detail.task_entity_links[0]["entity_id"] == "H1"
    assert task_detail.task_activities[0]["body"] == "Claimed after baseline finished."


async def test_create_task_tool_accepts_structured_experiment_base_fields(
    repos: Repositories,
) -> None:
    manager = await repos.agents.ensure_project_agent(
        project_id="P1",
        created_in_session_id="S1",
        kind="manager",
        display_name="Manager",
    )
    deps = SituToolDeps(
        session_id="S1",
        agent_id=manager.id,
        repos=repos,
    )

    result = await invoke_situ_tool(
        tool=CreateTaskTool(),
        deps=deps,
        title="Try component A",
        content="Change train.py only and run the primary measurement.",
        kind="experiment",
        research_thread="component-a",
        base_selector="selected_checkout",
    )

    assert result.success is True
    assert result.task is not None
    assert result.task["payload"]["research_thread"] == "component-a"
    assert result.task["payload"]["base_selector"] == "selected_checkout"


async def test_get_project_tool_reads_current_project(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    result = await invoke_situ_tool(tool=GetProjectTool(), deps=deps)

    assert result.success is True
    assert result.project is not None
    assert result.project["id"] == "P1"


async def test_create_project_tool_creates_and_attaches_project(repos: Repositories) -> None:
    db = Database(
        repos.projects.db.path.parent / "fresh.sqlite",
        workspace_id="workspace_fresh",
        repo_path="/tmp/fresh",
    )
    fresh = Repositories.create(db)
    workspace = await fresh.workspaces.ensure()
    await fresh.sessions.create(session_id="S1", workspace_id=workspace.id)
    deps = SituToolDeps(session_id="S1", repos=fresh)

    created = await invoke_situ_tool(
        tool=CreateProjectTool(),
        deps=deps,
        title="First",
        objective="First objective",
        research_context="Run eval; expected signals: score.",
    )

    assert created.success is True
    assert created.project is not None
    assert created.attached_to_current_run is True
    assert created.project["workspace_id"] == "workspace_fresh"

    updated = await invoke_situ_tool(
        tool=UpdateProjectTool(),
        deps=deps,
        research_context="Refined: focus on score, ignore latency.",
    )
    assert updated.success is True
    assert updated.project is not None
    assert "Refined" in updated.project["research_context"]


async def test_project_close_requires_request_and_confirmation(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    manager = await repos.agents.ensure_project_agent(
        project_id="P1",
        created_in_session_id="S1",
        kind="manager",
        display_name="Manager",
    )
    plan = await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Plan close",
        content="Decide whether to close.",
        kind="plan",
        priority="high",
        source_kind="manager",
    )
    await repos.tasks.claim(
        task_id=plan.id,
        agent_id=manager.id,
        eligible_kinds=["plan"],
        claimed_in_session_id="S1",
    )
    deps = SituToolDeps(
        session_id="S1",
        agent_id=manager.id,
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    direct_close = await invoke_situ_tool(
        tool=UpdateProjectTool(),
        deps=deps,
        status="closed",
    )
    assert direct_close.success is False
    assert direct_close.error is not None
    assert direct_close.error.code == "project_close_requires_confirmation"
    assert "request_project_close" in direct_close.error.message
    assert (await repos.projects.get(project_id="P1")).status == "active"

    request = await invoke_situ_tool(
        tool=RequestProjectCloseTool(),
        deps=deps,
        reason="Current best is sufficient.",
        evidence_summary="Two accepted experiments improved the target metric.",
        remaining_work_assessment="No obvious bounded next task remains.",
    )
    assert request.success is True
    assert request.confirmation_required is True
    assert request.confirmation_code is not None
    assert request.unresolved_hypothesis_ids == ["H1"]
    assert request.message is not None
    assert "Unresolved hypotheses remain: H1" in request.message
    assert (await repos.projects.get(project_id="P1")).status == "active"

    bad_confirm = await invoke_situ_tool(
        tool=ConfirmProjectCloseTool(),
        deps=deps,
        confirmation_code="close_project_wrong",
        final_summary="Close anyway.",
    )
    assert bad_confirm.success is False
    assert bad_confirm.error is not None
    assert bad_confirm.error.code == "project_close_confirmation_not_found"

    confirm = await invoke_situ_tool(
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
    activities = await repos.task_activities.list_for_task(task_id=plan.id)
    assert [activity.payload["activity_type"] for activity in activities] == [
        "project_close_requested",
        "project_close_confirmed",
    ]
    assert activities[0].payload["unresolved_hypothesis_ids"] == ["H1"]


async def test_analysis_tools_create_update_list_and_comment(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Codebase map",
        summary="Mapped the backend primitives.",
        content="The main knobs are records, repositories, tools, and protocol schemas.",
    )
    assert created.success is True
    assert created.analysis is not None
    assert created.analysis["id"] == "A1"
    assert created.analysis["project_id"] == "P1"
    assert created.analysis["created_in_session_id"] == "S1"
    assert created.analysis["status"] == "open"

    comment = await invoke_situ_tool(
        tool=AddAnalysisCommentTool(),
        deps=deps,
        analysis_id="A1",
        comment="This map is ready to feed hypothesis generation.",
        payload={"source": "first pass"},
    )
    assert comment.success is True
    assert comment.activity is not None
    assert comment.activity["kind"] == "comment"
    assert comment.activity["created_in_session_id"] == "S1"
    assert comment.activity["payload"] == {"source": "first pass"}

    updated = await invoke_situ_tool(
        tool=UpdateAnalysisTool(),
        deps=deps,
        analysis_id="A1",
        status="active",
        summary="Synthesized backend map into candidate work.",
    )
    assert updated.success is True
    assert updated.analysis is not None
    assert updated.analysis["status"] == "active"

    listed = await invoke_situ_tool(
        tool=ListAnalysesTool(),
        deps=deps,
        status="active",
    )
    activities = await invoke_situ_tool(
        tool=ListAnalysisActivitiesTool(),
        deps=deps,
        analysis_id="A1",
    )

    assert [analysis["id"] for analysis in listed.analyses] == [
        "A1"
    ]
    assert [activity["id"] for activity in activities.activities] == [1]
    assert [event["type"] for event in emitted] == [
        "analysis.created",
        "analysis.comment_added",
        "analysis.updated",
    ]


async def test_hypothesis_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = await invoke_situ_tool(
        tool=CreateHypothesisTool(),
        deps=deps,
        title="Component C helps",
        summary="Component C may combine with A.",
    )
    assert created.success is True
    assert created.hypothesis is not None
    assert created.hypothesis["id"] == "H2"
    assert created.hypothesis["project_id"] == "P1"
    assert created.hypothesis["created_in_session_id"] == "S1"
    assert created.hypothesis["status"] == "open"

    updated = await invoke_situ_tool(
        tool=UpdateHypothesisTool(),
        deps=deps,
        hypothesis_id="H2",
        status="active",
        summary="Component C is ready to test.",
    )
    assert updated.success is True
    assert updated.hypothesis is not None
    assert updated.hypothesis["status"] == "active"

    listed = await invoke_situ_tool(
        tool=ListHypothesesTool(),
        deps=deps,
        status="active",
    )
    assert listed.success is True
    assert [hypothesis["id"] for hypothesis in listed.hypotheses] == [
        "H1",
        "H2",
    ]
    assert [event["type"] for event in emitted] == [
        "hypothesis.created",
        "hypothesis.updated",
    ]


async def test_resolve_hypothesis_closes_with_resolution_activity(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    result = await invoke_situ_tool(
        tool=ResolveHypothesisTool(),
        deps=deps,
        hypothesis_id="H1",
        resolution="supported",
        summary="Component A is supported enough to continue.",
        evidence_entity_ids=["EX1"],
    )

    assert result.success is True
    assert result.hypothesis is not None
    assert result.hypothesis["status"] == "closed"
    assert result.activity is not None
    assert result.activity["body"] == "Component A is supported enough to continue."
    assert result.activity["payload"] == {
        "activity_type": "hypothesis_resolution",
        "resolution": "supported",
        "evidence_entity_ids": ["EX1"],
        "superseded_by_hypothesis_id": None,
    }
    assert [event["type"] for event in emitted] == ["hypothesis.resolved"]


async def test_resolve_hypothesis_validates_supersession_and_evidence(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await repos.hypotheses.create(
        hypothesis_id="H2",
        project_id="P1",
        created_in_session_id="S1",
        title="Component B helps",
        summary="Component B may improve score.",
    )

    missing_superseding = await invoke_situ_tool(
        tool=ResolveHypothesisTool(),
        deps=deps,
        hypothesis_id="H1",
        resolution="superseded",
        summary="Component B is the sharper version.",
    )
    invalid_evidence = await invoke_situ_tool(
        tool=ResolveHypothesisTool(),
        deps=deps,
        hypothesis_id="H1",
        resolution="supported",
        summary="This cites missing evidence.",
        evidence_entity_ids=["EX404"],
    )
    superseded = await invoke_situ_tool(
        tool=ResolveHypothesisTool(),
        deps=deps,
        hypothesis_id="H1",
        resolution="superseded",
        summary="Component B is the sharper version.",
        superseded_by_hypothesis_id="H2",
        evidence_entity_ids=["H2"],
    )

    assert missing_superseding.success is False
    assert missing_superseding.error is not None
    assert missing_superseding.error.code == "missing_superseded_by_hypothesis"
    assert invalid_evidence.success is False
    assert invalid_evidence.error is not None
    assert invalid_evidence.error.code == "invalid_evidence_entity"
    assert superseded.success is True
    assert superseded.activity is not None
    assert superseded.activity["payload"]["resolution"] == "superseded"
    assert superseded.activity["payload"]["superseded_by_hypothesis_id"] == "H2"


async def test_experiment_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = await invoke_situ_tool(
        tool=CreateExperimentTool(),
        deps=deps,
        title="Try component C",
        summary="Apply component C independently.",
    )
    assert created.success is True
    assert created.experiment is not None
    assert created.experiment["id"] == "EX2"
    assert created.experiment["project_id"] == "P1"
    assert created.experiment["created_in_session_id"] == "S1"
    assert created.experiment["status"] == "open"

    updated = await invoke_situ_tool(
        tool=UpdateExperimentTool(),
        deps=deps,
        experiment_id="EX2",
        status="closed",
        summary="Component C improved score but hurt latency.",
    )
    assert updated.success is True
    assert updated.experiment is not None
    assert updated.experiment["status"] == "closed"

    listed = await invoke_situ_tool(tool=ListExperimentsTool(), deps=deps)
    assert listed.success is True
    assert [experiment["id"] for experiment in listed.experiments] == [
        "EX1",
        "EX2",
    ]
    assert [event["type"] for event in emitted] == [
        "experiment.created",
        "experiment.updated",
    ]


async def test_baseline_tools_create_update_and_list(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    created = await invoke_situ_tool(
        tool=CreateBaselineTool(),
        deps=deps,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    assert created.success is True
    assert created.baseline is not None
    assert created.baseline["id"] == "B1"
    assert created.baseline["project_id"] == "P1"
    assert created.baseline["created_in_session_id"] == "S1"
    assert created.baseline["status"] == "open"

    updated = await invoke_situ_tool(
        tool=UpdateBaselineTool(),
        deps=deps,
        baseline_id="B1",
        status="closed",
        summary="Baseline selected for comparison.",
    )
    assert updated.success is True
    assert updated.baseline is not None
    assert updated.baseline["status"] == "closed"

    listed = await invoke_situ_tool(tool=ListBaselinesTool(), deps=deps)
    assert listed.success is True
    assert [baseline["id"] for baseline in listed.baselines] == [
        "B1"
    ]
    assert [event["type"] for event in emitted] == [
        "baseline.created",
        "baseline.updated",
    ]


async def test_evaluation_tools_create_update_list_and_add_results(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )
    baseline = await invoke_situ_tool(
        tool=CreateBaselineTool(),
        deps=deps,
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    assert baseline.baseline is not None

    created = await invoke_situ_tool(
        tool=CreateEvaluationTool(),
        deps=deps,
        title="Baseline project eval",
        summary="Run the normal project test/eval command before changes.",
        associated_baseline_id=baseline.baseline["id"],
    )
    assert created.success is True
    assert created.evaluation is not None
    assert created.evaluation["id"] == "EV1"
    assert created.evaluation["project_id"] == "P1"
    assert created.evaluation["created_in_session_id"] == "S1"
    assert created.evaluation["status"] == "open"
    assert created.evaluation["associated_baseline_id"] == baseline.baseline["id"]

    result = await invoke_situ_tool(
        tool=AddMeasurementTool(),
        deps=deps,
        evaluation_id="EV1",
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

    updated = await invoke_situ_tool(
        tool=UpdateEvaluationTool(),
        deps=deps,
        evaluation_id="EV1",
        status="closed",
        summary="Baseline result recorded.",
    )
    assert updated.success is True
    assert updated.evaluation is not None
    assert updated.evaluation["status"] == "closed"

    listed = await invoke_situ_tool(tool=ListEvaluationsTool(), deps=deps)
    listed_measurements = await invoke_situ_tool(
        tool=ListMeasurementsTool(),
        deps=deps,
        baseline_id=baseline.baseline["id"],
    )
    measurements = await repos.measurements.list_for_evaluation(evaluation_id="EV1")

    assert listed.success is True
    assert [evaluation["id"] for evaluation in listed.evaluations] == [
        "EV1"
    ]
    assert [measurement["id"] for measurement in listed_measurements.measurements] == [
        "M1"
    ]
    assert [measurement.id for measurement in measurements] == ["M1"]
    assert [event["type"] for event in emitted] == [
        "baseline.created",
        "evaluation.created",
        "measurement.added",
        "evaluation.updated",
    ]


async def test_work_tools_reject_invalid_statuses_with_agent_readable_errors(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    experiment_update = await invoke_situ_tool(
        tool=UpdateExperimentTool(),
        deps=deps,
        experiment_id="EX1",
        status="completed",
    )
    hypothesis_update = await invoke_situ_tool(
        tool=UpdateHypothesisTool(),
        deps=deps,
        hypothesis_id="H1",
        status="completed",
    )
    experiment_list = await invoke_situ_tool(
        tool=ListExperimentsTool(),
        deps=deps,
        status="completed",
    )
    evaluation_list = await invoke_situ_tool(
        tool=ListEvaluationsTool(),
        deps=deps,
        status="completed",
    )
    analysis_list = await invoke_situ_tool(
        tool=ListAnalysesTool(),
        deps=deps,
        status="completed",
    )
    hypothesis_close = await invoke_situ_tool(
        tool=UpdateHypothesisTool(),
        deps=deps,
        hypothesis_id="H1",
        status="closed",
    )
    closed_hypothesis_create = await invoke_situ_tool(
        tool=CreateHypothesisTool(),
        deps=deps,
        title="Already resolved",
        summary="This should use resolve_hypothesis instead.",
        status="closed",
    )

    assert experiment_update.success is False
    assert experiment_update.error is not None
    assert "invalid experiment status: 'completed'" in experiment_update.error.message
    assert "'open', 'active', 'closed'" in experiment_update.error.message
    assert "comment instead" in experiment_update.error.message

    assert hypothesis_update.success is False
    assert hypothesis_update.error is not None
    assert "invalid hypothesis status: 'completed'" in hypothesis_update.error.message

    assert hypothesis_close.success is False
    assert hypothesis_close.error is not None
    assert hypothesis_close.error.code == "hypothesis_resolution_required"
    assert "resolve_hypothesis" in hypothesis_close.error.message

    assert closed_hypothesis_create.success is False
    assert closed_hypothesis_create.error is not None
    assert closed_hypothesis_create.error.code == "hypothesis_resolution_required"

    assert experiment_list.success is False
    assert experiment_list.error is not None
    assert "invalid experiment status: 'completed'" in experiment_list.error.message

    assert evaluation_list.success is False
    assert evaluation_list.error is not None
    assert "invalid evaluation status: 'completed'" in evaluation_list.error.message

    assert analysis_list.success is False
    assert analysis_list.error is not None
    assert "invalid analysis status: 'completed'" in analysis_list.error.message


async def test_link_tool_links_hypothesis_and_experiment(repos: Repositories) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    result = await invoke_situ_tool(
        tool=LinkHypothesisExperimentTool(),
        deps=deps,
        hypothesis_id="H1",
        experiment_id="EX1",
    )

    assert result.success is True
    assert result.link is not None
    assert result.link["hypothesis_id"] == "H1"
    assert result.link["experiment_id"] == "EX1"


async def test_comment_tools_write_activity_records(repos: Repositories) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )
    await repos.experiments.update(
        experiment_id="EX1",
        base_commit="base123456",
        candidate_commit="candidate789",
        research_thread="component_a",
    )

    hypothesis_comment = await invoke_situ_tool(
        tool=AddHypothesisCommentTool(),
        deps=deps,
        hypothesis_id="H1",
        comment="Component A is promising enough to test.",
        payload={"reason": "first pass"},
    )
    experiment_comment = await invoke_situ_tool(
        tool=AddExperimentCommentTool(),
        deps=deps,
        experiment_id="EX1",
        comment="Component A improved score.",
        payload={"signals": [{"key": "score", "value": 0.73}]},
    )
    evaluation = await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Candidate evaluation",
        summary="Candidate evidence for review.",
        associated_experiment_id="EX1",
    )
    measurement = await repos.measurements.add(
        evaluation_id=evaluation.id,
        created_in_session_id="S1",
        actor="worker",
        body="Candidate score=0.73.",
    )
    experiment_review = await invoke_situ_tool(
        tool=AddExperimentReviewTool(),
        deps=deps,
        experiment_id="EX1",
        review="The candidate needs reproduction before replanning trusts it.",
        verdict="needs_reproduction",
        recommended_next_step="reproduce",
        evidence_summary="One measurement improved, but there is no repeated run.",
        concern_kinds=["selection_on_noise"],
        reviewed_evaluation_ids=[evaluation.id],
        reviewed_measurement_ids=[measurement.id],
    )
    bad_experiment_review = await invoke_situ_tool(
        tool=AddExperimentReviewTool(),
        deps=deps,
        experiment_id="EX1",
        review="This cites missing evidence and should fail.",
        verdict="needs_reproduction",
        recommended_next_step="reproduce",
        reviewed_evaluation_ids=["EV404"],
        reviewed_measurement_ids=["M999"],
    )
    lineage_decision = await invoke_situ_tool(
        tool=AddExperimentLineageDecisionTool(),
        deps=deps,
        experiment_id="EX1",
        decision="reproduce",
        reason="Reproduce before continuing this branch.",
        critic_review_activity_id=experiment_review.activity["id"]
        if experiment_review.activity is not None
        else None,
    )
    bad_lineage_decision = await invoke_situ_tool(
        tool=AddExperimentLineageDecisionTool(),
        deps=deps,
        experiment_id="EX1",
        decision="fork",
        reason="This cites a missing parent and should fail.",
        parent_experiment_id="EX404",
    )
    bad_review_lineage_decision = await invoke_situ_tool(
        tool=AddExperimentLineageDecisionTool(),
        deps=deps,
        experiment_id="EX1",
        decision="reproduce",
        reason="This cites a non-review activity and should fail.",
        critic_review_activity_id=experiment_comment.activity["id"]
        if experiment_comment.activity is not None
        else None,
    )

    assert hypothesis_comment.success is True
    assert hypothesis_comment.activity is not None
    assert hypothesis_comment.activity["kind"] == "comment"
    assert hypothesis_comment.activity["created_in_session_id"] == "S1"
    assert hypothesis_comment.activity["body"] == "Component A is promising enough to test."
    assert experiment_comment.success is True
    assert experiment_comment.activity is not None
    assert experiment_comment.activity["kind"] == "comment"
    assert experiment_comment.activity["created_in_session_id"] == "S1"
    assert experiment_comment.activity["body"] == "Component A improved score."
    assert experiment_review.success is True
    assert experiment_review.activity is not None
    assert experiment_review.activity["kind"] == "comment"
    assert experiment_review.activity["actor"] == "critic"
    assert experiment_review.activity["payload"] == {
        "activity_type": "critic_review",
        "work_type": "review_experiment",
        "verdict": "needs_reproduction",
        "recommended_next_step": "reproduce",
        "evidence_summary": "One measurement improved, but there is no repeated run.",
        "concern_kinds": ["selection_on_noise"],
        "reviewed_evaluation_ids": ["EV1"],
        "reviewed_measurement_ids": [measurement.id],
    }
    assert bad_experiment_review.success is False
    assert bad_experiment_review.error is not None
    assert bad_experiment_review.error.code == "invalid_review_evaluation_ids"
    assert lineage_decision.success is True
    assert lineage_decision.activity is not None
    assert lineage_decision.activity["actor"] == "manager"
    assert lineage_decision.activity["payload"] == {
        "activity_type": "lineage_decision",
        "decision": "reproduce",
        "research_thread": "component_a",
        "parent_experiment_id": None,
        "base_commit": "base123456",
        "candidate_commit": "candidate789",
        "critic_review_activity_id": experiment_review.activity["id"]
        if experiment_review.activity is not None
        else None,
    }
    assert bad_lineage_decision.success is False
    assert bad_lineage_decision.error is not None
    assert bad_lineage_decision.error.code == "invalid_parent_experiment"
    assert bad_review_lineage_decision.success is False
    assert bad_review_lineage_decision.error is not None
    assert bad_review_lineage_decision.error.code == "invalid_critic_review_activity"

    hypothesis_activities = await invoke_situ_tool(
        tool=ListHypothesisActivitiesTool(),
        deps=deps,
        hypothesis_id="H1",
    )
    experiment_activities = await invoke_situ_tool(
        tool=ListExperimentActivitiesTool(),
        deps=deps,
        experiment_id="EX1",
    )

    assert [activity["id"] for activity in hypothesis_activities.activities] == [1]
    assert [activity["id"] for activity in experiment_activities.activities] == [
        1,
        2,
        3,
    ]
    assert [event["type"] for event in emitted] == [
        "hypothesis.comment_added",
        "experiment.comment_added",
        "experiment.review_added",
        "experiment.lineage_decision_added",
    ]


async def test_artifact_tools_create_and_list_artifacts(repos: Repositories) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    created = await invoke_situ_tool(
        tool=CreateArtifactTool(),
        deps=deps,
        kind="json",
        title="raw eval output",
        path="artifacts/raw.json",
        associated_entity_kind="experiment",
        associated_entity_id="EX1",
        media_type="application/json",
        size_bytes=120,
    )
    assert created.success is True
    assert created.artifact is not None
    assert created.artifact["id"] == "ART1"
    assert created.artifact["project_id"] == "P1"
    assert created.artifact["created_in_session_id"] == "S1"
    assert created.artifact["associated_entity_kind"] == "experiment"
    assert created.artifact["associated_entity_id"] == "EX1"

    listed = await invoke_situ_tool(
        tool=ListArtifactsTool(),
        deps=deps,
        associated_entity_kind="experiment",
        associated_entity_id="EX1",
    )
    assert listed.success is True
    assert [artifact["id"] for artifact in listed.artifacts] == [
        "ART1"
    ]


async def test_workspace_toolset_uses_repo_path_backend(tmp_path: Path) -> None:
    marker = tmp_path / "marker.txt"
    marker.write_text("workspace marker", encoding="utf-8")
    deps = SituToolDeps(session_id="S1", repo_path=str(tmp_path))

    result = await deps.backend.execute(
        "pwd && printf '\\n---\\n' && cat marker.txt",
        timeout=5,
    )
    toolset = build_workspace_toolset()
    execute_output = await _call_workspace_execute(
        toolset=toolset,
        deps=deps,
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


async def test_workspace_backend_routes_run_log_to_runtime_artifacts(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    workspace.mkdir()
    deps = SituToolDeps(
        session_id="S1",
        agent_id="agent_0001",
        project_dir=project_dir,
        repo_path=str(workspace),
    )

    write_result = await deps.backend.execute(
        "printf 'score: 1\\n' > run.log 2>&1",
        timeout=5,
    )
    read_result = await deps.backend.execute("grep '^score:' run.log", timeout=5)

    runtime_log = (
        project_dir
        / "artifacts"
        / "commands"
        / "S1"
        / "agent_0001"
        / "run.log"
    )
    assert write_result.exit_code == 0
    assert read_result.exit_code == 0
    assert runtime_log.read_text(encoding="utf-8") == "score: 1\n"
    assert "score: 1" in read_result.output
    assert "Routed run.log" in write_result.output
    assert not (workspace / "run.log").exists()


async def test_workspace_backend_records_command_receipt_artifacts(
    tmp_path: Path,
    repos: Repositories,
) -> None:
    workspace = tmp_path / "workspace"
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "metric.txt").write_text("score: 1.5\n", encoding="utf-8")
    _git(workspace, "add", ".")
    _git(
        workspace,
        "-c",
        "user.email=situ@example.test",
        "-c",
        "user.name=Situ Test",
        "commit",
        "-m",
        "initial",
    )
    deps = SituToolDeps(
        session_id="S1",
        agent_id="agent_0001",
        project_id="P1",
        project_dir=project_dir,
        repo_path=str(workspace),
        active_task_id="T1",
        repos=repos,
    )
    await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Run baseline",
        content="Run the baseline command.",
        kind="baseline",
        source_kind="manager",
    )

    result = await deps.backend.execute("cat metric.txt", timeout=5)
    await deps.flush_command_receipts()

    artifacts = await repos.artifacts.list_for_project(project_id="P1")
    assert result.exit_code == 0
    assert len(artifacts) == 1
    assert artifacts[0].kind == "command_receipt"
    assert artifacts[0].associated_entity_kind == "task"
    assert artifacts[0].associated_entity_id == "T1"
    receipt = json.loads((project_dir / artifacts[0].path).read_text())
    assert receipt["command"] == "cat metric.txt"
    assert receipt["exit_code"] == 0
    assert receipt["metrics"]["score"] == {
        "value": 1.5,
        "source": "stdout_heuristic",
    }
    assert await repos.task_entity_links.get(
        task_id="T1",
        entity_kind="artifact",
        entity_id=artifacts[0].id,
        relationship="receipt",
    )


async def test_research_toolset_includes_workspace_state_inspector() -> None:
    toolset = build_scientist_toolset()

    assert "inspect_workspace_state" in toolset.tools


async def test_inspect_workspace_state_classifies_candidate_changes(tmp_path: Path) -> None:
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

    deps = SituToolDeps(session_id="S1", repo_path=str(tmp_path))

    inspected = await invoke_situ_tool(
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


async def test_run_experiment_tool_executes_worker_and_records_activity(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        worker_manager=FakeWorkerManager(),
        emit_event=_event_collector(emitted),
    )

    result = await invoke_situ_tool(
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
    activities = await repos.experiment_activities.list_for_experiment(
        experiment_id=result.experiment["id"]
    )
    assert [activity.payload.get("activity_type") for activity in activities] == [
        "plan",
        "result",
    ]
    assert "worker.progress" in [event["type"] for event in emitted]


async def test_create_experiment_tool_reuses_active_experiment_context(
    repos: Repositories,
) -> None:
    existing = await repos.experiments.update(
        experiment_id="EX1",
        status="active",
        worktree_path="/tmp/situ-worktree",
        base_commit="abc123",
    )
    assert existing is not None
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        active_experiment_id=existing.id,
        emit_event=_event_collector(emitted),
    )

    result = await invoke_situ_tool(
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
    assert len(await repos.experiments.list_for_project(project_id="P1")) == 1
    assert "experiment.updated" in [event["type"] for event in emitted]


class FakeWorkerManager(WorkerManager):
    def __init__(self) -> None:
        pass

    async def run_experiment(
        self,
        params: ExperimentRunParams,
        on_progress: Any,
    ) -> ExperimentRunResult:
        await on_progress(
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
