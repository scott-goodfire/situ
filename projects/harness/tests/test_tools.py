from __future__ import annotations

import asyncio
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
from situ.harness.repositories import Repositories
from situ.harness.tools import build_scientist_toolset, build_workspace_toolset
from situ.harness.tools.activities import (
    ListAnalysisActivitiesTool,
    ListBaselineActivitiesTool,
    ListEvaluationActivitiesTool,
    ListExperimentActivitiesTool,
    ListHypothesisActivitiesTool,
)
from situ.harness.tools.analyses import (
    CreateAnalysisTool,
    ListAnalysesTool,
    SearchAnalysesTool,
    UpdateAnalysisTool,
)
from situ.harness.tools.artifacts import CreateArtifactTool, ListArtifactsTool
from situ.harness.tools.baselines import (
    AcceptBaselineTool,
    CancelBaselineTool,
    CompleteBaselineTool,
    CreateBaselineTool,
    FailBaselineTool,
    ListBaselinesTool,
    SearchBaselinesTool,
    SubmitBaselineTool,
    UpdateBaselineTool,
)
from situ.harness.tools.baseline_activities import AddBaselineCommentTool
from situ.harness.tools.analysis_activities import AddAnalysisCommentTool
from situ.harness.tools.common import BaseSituTool, SituToolDeps
from situ.harness.tools.evaluations import (
    CompleteEvaluationTool,
    CreateEvaluationTool,
    ListEvaluationsTool,
    SearchEvaluationsTool,
    SubmitEvaluationTool,
    UpdateEvaluationTool,
)
from situ.harness.tools.experiments import (
    CompleteExperimentTool,
    CreateExperimentTool,
    ListExperimentsTool,
    SearchExperimentsTool,
    SubmitExperimentTool,
    UpdateExperimentTool,
)
from situ.harness.tools.experiment_activities import (
    AddExperimentCommentTool,
    AddExperimentLineageDecisionTool,
)
from situ.harness.tools.hypotheses import (
    CreateHypothesisTool,
    ListHypothesesTool,
    ResolveHypothesisTool,
    SearchHypothesesTool,
    UpdateHypothesisTool,
)
from situ.harness.tools.hypothesis_activities import AddHypothesisCommentTool
from situ.harness.tools.links import LinkHypothesisExperimentTool
from situ.harness.tools.measurements import (
    AddMeasurementTool,
    ListMeasurementsTool,
    SearchMeasurementsTool,
)
from situ.harness.tools.projects import (
    ConfirmProjectCloseTool,
    CreateProjectTool,
    GetProjectTool,
    RequestProjectCloseTool,
    UpdateProjectTool,
)
from situ.harness.tools.project_overview import GetProjectOverviewTool
from situ.harness.tools.search import SearchEverythingTool
from situ.harness.tools.tasks import (
    ClaimTaskTool,
    CreateTaskTool,
    GetTaskTool,
    GetTaskOverviewTool,
    LinkTaskEntityTool,
    SearchTasksTool,
    UpdateTaskTool,
)
from situ.harness.tools.task_activities import AddTaskCommentTool
from situ.harness.tools.workspace_state import InspectWorkspaceStateTool

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
    await repos.baseline_activities.add(
        baseline_id=baseline.id,
        created_in_session_id="S1",
        actor="agent",
        kind="comment",
        body="Baseline evidence is ready.",
    )

    result = await invoke_situ_tool(tool=GetProjectOverviewTool(), deps=deps)

    assert result.success is True
    assert "second" in result.summary["session_elapsed"]
    assert result.summary["record_counts"]["experiments"]["total"] == 1
    assert result.summary["record_counts"]["measurements"]["total"] == 1
    assert result.summary["review_counts"]["pending_critic_records"] == 3
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
    assert [activity["baseline_id"] for activity in result.baseline_activities] == [
        "B1"
    ]


async def test_get_project_overview_caps_large_session_lists(
    repos: Repositories,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SITU_OVERVIEW_RECORDS_CAP", "3")
    monkeypatch.setenv("SITU_OVERVIEW_TASKS_CAP", "4")
    deps = SituToolDeps(session_id="S1", repos=repos)
    for index in range(2, 9):
        await repos.experiments.create(
            experiment_id=f"EX{index}",
            project_id="P1",
            created_in_session_id="S1",
            title=f"Candidate {index}",
            summary="Long-run fixture.",
        )
    for index in range(1, 8):
        await repos.tasks.create(
            task_id=f"T{index}",
            project_id="P1",
            created_in_session_id="S1",
            title=f"Task {index}",
            content="Long-run task fixture.",
            kind="research",
            priority="normal",
            source_kind="manager",
        )

    result = await invoke_situ_tool(tool=GetProjectOverviewTool(), deps=deps)

    assert result.summary["record_counts"]["experiments"]["total"] == 8
    assert [experiment["id"] for experiment in result.experiments] == [
        "EX6",
        "EX7",
        "EX8",
    ]
    assert [task["id"] for task in result.tasks] == ["T4", "T5", "T6", "T7"]


async def test_critic_review_target_blocks_other_transition_tools(
    repos: Repositories,
) -> None:
    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Baseline intake",
        summary="Review this baseline.",
    )
    other_baseline = await repos.baselines.create(
        baseline_id="B2",
        project_id="P1",
        created_in_session_id="S1",
        title="Other baseline",
        summary="This review pass does not own this baseline.",
    )
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        active_review_target_kind="baseline",
        active_review_target_id=baseline.id,
    )

    accepted = await invoke_situ_tool(
        tool=AcceptBaselineTool(),
        deps=deps,
        baseline_id=baseline.id,
        comment="Looks coherent.",
    )
    blocked = await invoke_situ_tool(
        tool=CompleteExperimentTool(),
        deps=deps,
        experiment_id="EX1",
        comment="Wrong target.",
    )
    blocked_same_kind = await invoke_situ_tool(
        tool=AcceptBaselineTool(),
        deps=deps,
        baseline_id=other_baseline.id,
        comment="Wrong baseline.",
    )

    assert accepted.success is True
    assert blocked.success is False
    assert blocked.error is not None
    assert blocked.error.code == "permission_denied"
    assert blocked_same_kind.success is False
    assert blocked_same_kind.error is not None
    assert blocked_same_kind.error.code == "permission_denied"


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
    assert board.summary["task_counts"]["total"] == 2
    assert board.summary["task_counts"]["open"] == 1
    assert board.summary["task_counts"]["blocked"] == 0
    assert board.summary["task_counts"]["by_status"] == {
        "done": 1,
        "in_progress": 1,
    }
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


async def test_record_create_tools_auto_link_to_active_task(
    repos: Repositories,
) -> None:
    task = await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Run baseline and first candidate",
        content="Create the records produced by this task.",
        kind="experiment",
        priority="normal",
        source_kind="manager",
    )
    deps = SituToolDeps(session_id="S1", repos=repos, active_task_id=task.id)

    baseline = await invoke_situ_tool(
        tool=CreateBaselineTool(),
        deps=deps,
        title="Baseline",
        summary="Reference run.",
    )
    assert baseline.baseline is not None
    evaluation = await invoke_situ_tool(
        tool=CreateEvaluationTool(),
        deps=deps,
        title="Baseline eval",
        summary="Measure the baseline.",
        associated_baseline_id=baseline.baseline["id"],
    )
    experiment = await invoke_situ_tool(
        tool=CreateExperimentTool(),
        deps=deps,
        title="Candidate",
        summary="Try one candidate.",
    )

    links = await repos.task_entity_links.list_for_task(task_id=task.id)
    assert [
        (link.entity_kind.value, link.entity_id, link.relationship)
        for link in links
    ] == [
        ("baseline", "B1", "created"),
        ("evaluation", "EV1", "created"),
        ("experiment", "EX2", "created"),
    ]
    assert evaluation.success is True
    assert experiment.success is True


async def test_link_task_entity_validates_target_project(
    repos: Repositories,
) -> None:
    workspace = await repos.workspaces.ensure()
    await repos.projects.create(
        project_id="P2",
        workspace_id=workspace.id,
        title="Other project",
        objective="Other objective",
        research_context="Other context.",
    )
    await repos.experiments.create(
        experiment_id="EX2",
        project_id="P2",
        created_in_session_id="S1",
        title="Other candidate",
        summary="Belongs to a different project.",
    )
    task = await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Use evidence",
        content="Link evidence.",
        kind="research",
        priority="normal",
        source_kind="manager",
    )
    deps = SituToolDeps(session_id="S1", repos=repos)

    missing = await invoke_situ_tool(
        tool=LinkTaskEntityTool(),
        deps=deps,
        task_id=task.id,
        entity_kind="measurement",
        entity_id="M404",
        relationship="references",
    )
    cross_project = await invoke_situ_tool(
        tool=LinkTaskEntityTool(),
        deps=deps,
        task_id=task.id,
        entity_kind="experiment",
        entity_id="EX2",
        relationship="references",
    )
    valid = await invoke_situ_tool(
        tool=LinkTaskEntityTool(),
        deps=deps,
        task_id=task.id,
        entity_kind="hypothesis",
        entity_id="H1",
        relationship="references",
    )

    assert missing.success is False
    assert missing.error is not None
    assert missing.error.code == "entity_target_not_found"
    assert cross_project.success is False
    assert cross_project.error is not None
    assert cross_project.error.code == "entity_target_not_found"
    assert valid.success is True
    assert len(await repos.task_entity_links.list_for_task(task_id=task.id)) == 1


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
        hypothesis_ids=["H1"],
    )

    assert result.success is True
    assert result.task is not None
    assert result.task["payload"]["research_thread"] == "component-a"
    assert result.task["payload"]["base_selector"] == "selected_checkout"
    assert result.task["payload"]["hypothesis_ids"] == ["H1"]
    assert result.task_entity_links[0]["entity_kind"] == "hypothesis"
    assert result.task_entity_links[0]["entity_id"] == "H1"
    assert result.task_entity_links[0]["relationship"] == "tests"


async def test_create_task_tool_rejects_experiment_without_hypothesis(
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

    assert result.success is False
    assert result.error is not None
    assert result.error.code == "experiment_task_requires_hypothesis"
    tasks = await repos.tasks.list_for_project(project_id="P1")
    assert tasks == []


async def test_create_task_tool_rejects_experiment_with_unaccepted_hypothesis(
    repos: Repositories,
) -> None:
    await repos.hypotheses.create(
        hypothesis_id="H2",
        project_id="P1",
        created_in_session_id="S1",
        title="Component B might help",
        summary="This claim is still waiting for Critic acceptance.",
        status="triage",
    )
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
        title="Try component B",
        content="Change train.py only and run the primary measurement.",
        kind="experiment",
        research_thread="component-b",
        base_selector="selected_checkout",
        hypothesis_ids=["H2"],
    )

    assert result.success is False
    assert result.error is not None
    assert result.error.code == "experiment_task_hypothesis_not_ready"
    assert "triage" in result.error.message
    tasks = await repos.tasks.list_for_project(project_id="P1")
    assert tasks == []


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
    assert created.analysis["status"] == "triage"

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
    assert created.hypothesis["status"] == "triage"

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
    assert result.hypothesis["status"] == "done"
    assert result.activity is not None
    assert result.activity["body"] == "Component A is supported enough to continue."
    assert result.activity["payload"] == {
        "record_type": "hypothesis_resolution",
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
    assert created.experiment["status"] == "triage"

    updated = await invoke_situ_tool(
        tool=UpdateExperimentTool(),
        deps=deps,
        experiment_id="EX2",
        status="done",
        summary="Component C improved score but hurt latency.",
    )
    assert updated.success is True
    assert updated.experiment is not None
    assert updated.experiment["status"] == "done"

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
    assert created.baseline["status"] == "active"

    updated = await invoke_situ_tool(
        tool=UpdateBaselineTool(),
        deps=deps,
        baseline_id="B1",
        status="done",
        summary="Baseline selected for comparison.",
    )
    assert updated.success is True
    assert updated.baseline is not None
    assert updated.baseline["status"] == "done"

    listed = await invoke_situ_tool(tool=ListBaselinesTool(), deps=deps)
    assert listed.success is True
    assert [baseline["id"] for baseline in listed.baselines] == [
        "B1"
    ]
    assert [event["type"] for event in emitted] == [
        "baseline.created",
        "baseline.updated",
    ]


async def test_list_baseline_activities_reads_project_and_baseline_slices(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )
    await repos.baseline_activities.add(
        baseline_id=baseline.id,
        created_in_session_id="S1",
        actor="scientist",
        kind="status_updated",
        body="Status changed from active to in_review.",
        payload={"from_status": "active", "to_status": "in_review"},
    )
    await repos.baseline_activities.add(
        baseline_id=baseline.id,
        created_in_session_id="S1",
        actor="scientist",
        kind="comment",
        body="Baseline run produced stable score evidence.",
    )

    all_project = await invoke_situ_tool(
        tool=ListBaselineActivitiesTool(),
        deps=deps,
    )
    for_baseline = await invoke_situ_tool(
        tool=ListBaselineActivitiesTool(),
        deps=deps,
        baseline_id=baseline.id,
    )

    assert all_project.success is True
    assert [activity["kind"] for activity in all_project.activities] == [
        "status_updated",
        "comment",
    ]
    assert for_baseline.activities == all_project.activities
    assert for_baseline.activities[0]["payload"] == {
        "from_status": "active",
        "to_status": "in_review",
    }


async def test_add_baseline_comment_writes_activity(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )
    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Current workspace baseline",
        summary="Reference behavior before candidate changes.",
    )

    result = await invoke_situ_tool(
        tool=AddBaselineCommentTool(),
        deps=deps,
        baseline_id=baseline.id,
        comment="Baseline score is stable enough for comparison.",
        payload={"source": "review"},
    )

    assert result.success is True
    assert result.activity is not None
    assert result.activity["baseline_id"] == baseline.id
    assert result.activity["kind"] == "comment"
    assert result.activity["body"] == "Baseline score is stable enough for comparison."
    assert result.activity["payload"] == {"source": "review"}
    assert [event["type"] for event in emitted] == ["baseline.comment_added"]
    assert emitted[0]["payload"] == {
        "activity_id": result.activity["id"],
        "baseline_id": baseline.id,
    }


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
    assert created.evaluation["status"] == "active"
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
        status="done",
        summary="Baseline result recorded.",
    )
    assert updated.success is True
    assert updated.evaluation is not None
    assert updated.evaluation["status"] == "done"

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
        status="done",
    )
    closed_hypothesis_create = await invoke_situ_tool(
        tool=CreateHypothesisTool(),
        deps=deps,
        title="Already resolved",
        summary="This should use resolve_hypothesis instead.",
        status="done",
    )

    assert experiment_update.success is False
    assert experiment_update.error is not None
    assert "invalid experiment status: 'completed'" in experiment_update.error.message

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
    lineage_decision = await invoke_situ_tool(
        tool=AddExperimentLineageDecisionTool(),
        deps=deps,
        experiment_id="EX1",
        decision="reproduce",
        reason="Reproduce before continuing this branch.",
    )
    bad_lineage_decision = await invoke_situ_tool(
        tool=AddExperimentLineageDecisionTool(),
        deps=deps,
        experiment_id="EX1",
        decision="fork",
        reason="This cites a missing parent and should fail.",
        parent_experiment_id="EX404",
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
    assert lineage_decision.success is True
    assert lineage_decision.activity is not None
    assert lineage_decision.activity["actor"] == "manager"
    assert lineage_decision.activity["kind"] == "recorded"
    assert lineage_decision.activity["payload"]["record_type"] == "lineage_decision"
    assert lineage_decision.activity["payload"]["decision"] == "reproduce"
    assert lineage_decision.activity["payload"]["research_thread"] == "component_a"
    assert lineage_decision.activity["payload"]["base_commit"] == "base123456"
    assert lineage_decision.activity["payload"]["candidate_commit"] == "candidate789"
    assert bad_lineage_decision.success is False
    assert bad_lineage_decision.error is not None
    assert bad_lineage_decision.error.code == "invalid_parent_experiment"

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
    assert [activity["id"] for activity in experiment_activities.activities] == [1, 2]
    assert [event["type"] for event in emitted] == [
        "hypothesis.comment_added",
        "experiment.comment_added",
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


async def test_create_artifact_materializes_external_file_and_links_active_task(
    repos: Repositories,
    tmp_path: Path,
) -> None:
    project_dir = tmp_path / "state"
    project_dir.mkdir()
    external = tmp_path / "outside.log"
    external.write_text("raw output\n", encoding="utf-8")
    task = await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Capture receipt",
        content="Attach an external receipt.",
        kind="experiment",
        priority="normal",
        source_kind="manager",
    )
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        project_dir=project_dir,
        active_task_id=task.id,
    )

    created = await invoke_situ_tool(
        tool=CreateArtifactTool(),
        deps=deps,
        kind="log",
        title="run log",
        path=str(external),
        associated_entity_kind="experiment",
        associated_entity_id="EX1",
        media_type="text/plain",
    )

    assert created.success is True
    assert created.artifact is not None
    stored_path = Path(created.artifact["path"])
    assert not stored_path.is_absolute()
    assert (project_dir / stored_path).read_text(encoding="utf-8") == "raw output\n"
    assert created.artifact["size_bytes"] == len("raw output\n")
    links = await repos.task_entity_links.list_for_task(task_id=task.id)
    assert [(link.entity_kind.value, link.entity_id) for link in links] == [
        ("artifact", "ART1")
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


async def test_workspace_backend_applies_execution_env(tmp_path: Path) -> None:
    deps = SituToolDeps(
        session_id="S1",
        repo_path=str(tmp_path),
        execution_env={
            "CUDA_VISIBLE_DEVICES": "1",
            "SITU_COMPUTE_TARGET_ID": "CT2",
        },
    )

    result = await deps.backend.execute(
        "printf '%s|%s' \"$CUDA_VISIBLE_DEVICES\" \"$SITU_COMPUTE_TARGET_ID\"",
        timeout=5,
    )

    assert result.exit_code == 0
    assert result.output == "1|CT2"


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


async def test_workspace_execute_records_concurrent_command_receipts_without_id_collision(
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
    await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Run candidate",
        content="Run the candidate command.",
        kind="experiment",
        source_kind="manager",
    )
    deps = SituToolDeps(
        session_id="S1",
        agent_id="agent_0001",
        project_id="P1",
        project_dir=project_dir,
        repo_path=str(workspace),
        active_task_id="T1",
        active_experiment_id="EX1",
        repos=repos,
    )
    toolset = build_workspace_toolset()
    ctx = RunContext(
        deps=deps,
        model=TestModel(),
        usage=RunUsage(),
    )
    tools = await toolset.get_tools(ctx)

    async def run_execute() -> Any:
        return await toolset.call_tool(
            "execute",
            {
                "command": (
                    "python -c 'import time; time.sleep(0.05); "
                    "print(\"score: 1.5\")'"
                ),
                "timeout": 5,
            },
            ctx,
            tools["execute"],
        )

    first, second = await asyncio.gather(run_execute(), run_execute())

    artifacts = await repos.artifacts.list_for_project(project_id="P1")
    assert "score: 1.5" in str(first)
    assert "score: 1.5" in str(second)
    assert [artifact.id for artifact in artifacts] == ["ART1", "ART2"]
    assert [artifact.kind for artifact in artifacts] == [
        "command_receipt",
        "command_receipt",
    ]
    assert {
        json.loads((project_dir / artifact.path).read_text())["command"]
        for artifact in artifacts
    } == {
        "python -c 'import time; time.sleep(0.05); print(\"score: 1.5\")'"
    }


async def test_workspace_execute_rejects_closed_session_without_receipt(
    tmp_path: Path,
    repos: Repositories,
) -> None:
    workspace = tmp_path / "workspace"
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    _git(
        workspace,
        "-c",
        "user.email=situ@example.test",
        "-c",
        "user.name=Situ Test",
        "commit",
        "--allow-empty",
        "-m",
        "initial",
    )
    await repos.sessions.update_status(session_id="S1", status="closed")
    deps = SituToolDeps(
        session_id="S1",
        agent_id="agent_0001",
        project_id="P1",
        project_dir=project_dir,
        repo_path=str(workspace),
        repos=repos,
    )
    toolset = build_workspace_toolset()
    ctx = RunContext(
        deps=deps,
        model=TestModel(),
        usage=RunUsage(),
    )
    tools = await toolset.get_tools(ctx)

    result = await toolset.call_tool(
        "execute",
        {"command": "touch should-not-exist", "timeout": 5},
        ctx,
        tools["execute"],
    )

    assert "session S1 is closed" in str(result)
    assert not (workspace / "should-not-exist").exists()
    assert await repos.artifacts.list_for_project(project_id="P1") == []


async def test_state_mutation_tool_rejects_closed_session(
    repos: Repositories,
) -> None:
    task = await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        created_in_session_id="S1",
        title="Inspect evidence",
        content="Add a note.",
        kind="research",
        source_kind="manager",
    )
    await repos.sessions.update_status(session_id="S1", status="closed")
    deps = SituToolDeps(session_id="S1", repos=repos)

    result = await invoke_situ_tool(
        tool=AddTaskCommentTool(),
        deps=deps,
        task_id=task.id,
        comment="This should not land.",
    )

    assert result.success is False
    assert result.error is not None
    assert result.error.code == "session_closed"
    assert await repos.task_activities.list_for_task(task_id=task.id) == []


async def test_workspace_execute_tool_is_sequential() -> None:
    toolset = build_workspace_toolset()

    assert toolset.tools["execute"].sequential is True


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


async def test_search_tools_find_records_in_current_project(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Latency investigation",
        summary="TLS handshake adds 30ms cold start",
        content="The cold-start TLS handshake is the dominant tail latency contributor.",
    )
    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Cache miss pattern",
        summary="Hot cache lines are being evicted by background writer",
        content="When the writer thread sweeps every 5s, hot read cache is invalidated.",
    )
    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        title="Cold-start latency baseline",
        summary="Median cold-start latency over 100 runs.",
        created_in_session_id="S1",
    )
    await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        title="Cold start latency benchmark",
        summary="Run loadgen with cold connections and measure handshake.",
        associated_baseline_id="B1",
        created_in_session_id="S1",
    )
    await repos.measurements.add(
        evaluation_id="EV1",
        actor="scientist",
        body="p99 cold-start handshake observed at 47ms across 100 runs.",
        created_in_session_id="S1",
    )
    await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        title="Investigate TLS preconnect viability",
        content="Look into whether preconnect can warm TLS sessions.",
        kind="research",
        priority="normal",
        source_kind="manager",
        created_in_session_id="S1",
    )

    analyses = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="TLS handshake"
    )
    assert analyses.success is True
    assert [a["id"] for a in analyses.analyses] == ["A1"]
    assert "[TLS]" in analyses.analyses[0]["snippet"]
    assert "[handshake]" in analyses.analyses[0]["snippet"]

    hypotheses = await invoke_situ_tool(
        tool=SearchHypothesesTool(), deps=deps, query="component"
    )
    assert [h["id"] for h in hypotheses.hypotheses] == ["H1"]

    experiments = await invoke_situ_tool(
        tool=SearchExperimentsTool(), deps=deps, query="component"
    )
    assert [e["id"] for e in experiments.experiments] == ["EX1"]

    baselines = await invoke_situ_tool(
        tool=SearchBaselinesTool(), deps=deps, query="cold-start latency"
    )
    assert [b["id"] for b in baselines.baselines] == ["B1"]

    evaluations = await invoke_situ_tool(
        tool=SearchEvaluationsTool(), deps=deps, query="loadgen handshake"
    )
    assert [e["id"] for e in evaluations.evaluations] == ["EV1"]

    measurements = await invoke_situ_tool(
        tool=SearchMeasurementsTool(), deps=deps, query="cold-start handshake"
    )
    assert len(measurements.measurements) == 1
    assert "[handshake]" in measurements.measurements[0]["snippet"]

    tasks = await invoke_situ_tool(
        tool=SearchTasksTool(), deps=deps, query="TLS preconnect"
    )
    assert [t["id"] for t in tasks.tasks] == ["T1"]
    assert "[TLS]" in tasks.tasks[0]["snippet"]


async def test_search_tools_do_not_leak_other_projects(
    repos: Repositories,
) -> None:
    workspace = await repos.workspaces.ensure()
    await repos.projects.create(
        project_id="P2",
        workspace_id=workspace.id,
        title="Other project",
        objective="Do other work.",
        research_context="Different research context.",
    )
    await repos.sessions.create(
        session_id="S2",
        workspace_id=workspace.id,
        project_id="P2",
    )

    p1_deps = SituToolDeps(session_id="S1", repos=repos)
    p2_deps = SituToolDeps(session_id="S2", repos=repos)

    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=p1_deps,
        title="P1 analysis",
        summary="signature_phrase_alpha appears here",
        content="Project P1 content with signature_phrase_alpha.",
    )
    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=p2_deps,
        title="P2 analysis",
        summary="signature_phrase_alpha also here",
        content="Project P2 content with signature_phrase_alpha.",
    )

    p1_hits = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=p1_deps, query="signature_phrase_alpha"
    )
    p2_hits = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=p2_deps, query="signature_phrase_alpha"
    )

    assert {a["project_id"] for a in p1_hits.analyses} == {"P1"}
    assert {a["project_id"] for a in p2_hits.analyses} == {"P2"}
    assert len(p1_hits.analyses) == 1
    assert len(p2_hits.analyses) == 1


async def test_search_fts_syncs_on_update_and_delete(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Initial title",
        summary="Original summary about TLS handshakes.",
        content="Original content body covering TLS handshake topics.",
    )

    initial = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="TLS handshake"
    )
    assert [a["id"] for a in initial.analyses] == ["A1"]

    await invoke_situ_tool(
        tool=UpdateAnalysisTool(),
        deps=deps,
        analysis_id="A1",
        content="Replaced content body covering cache invalidation entirely.",
        summary="Replaced summary about cache invalidation.",
    )

    after_stale = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="TLS handshake"
    )
    after_fresh = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="cache invalidation"
    )
    assert after_stale.analyses == []
    assert [a["id"] for a in after_fresh.analyses] == ["A1"]

    await repos.analyses.db.execute("DELETE FROM analyses WHERE id = ?", ("A1",))
    after_delete = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="cache invalidation"
    )
    assert after_delete.analyses == []


async def test_search_everything_returns_grouped_hits_across_kinds(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Latency analysis",
        summary="TLS preconnect investigation",
        content="The cold-start TLS preconnect path is the dominant tail.",
    )
    await repos.analysis_activities.add(
        analysis_id="A1",
        actor="researcher",
        kind="comment",
        body="Found related TLS preconnect notes in prior analysis.",
        created_in_session_id="S1",
    )
    await repos.experiment_activities.add(
        experiment_id="EX1",
        actor="scientist",
        kind="comment",
        body="EX1 attempted TLS preconnect; no measurable improvement.",
        created_in_session_id="S1",
    )
    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        title="Latency baseline",
        summary="Current TLS behavior before candidate changes.",
        created_in_session_id="S1",
    )
    await repos.baseline_activities.add(
        baseline_id="B1",
        actor="scientist",
        kind="comment",
        body="Baseline captured TLS preconnect disabled behavior.",
        created_in_session_id="S1",
    )
    await repos.tasks.create(
        task_id="T1",
        project_id="P1",
        title="Investigate TLS preconnect",
        content="See if preconnect helps cold-start tail.",
        kind="research",
        priority="normal",
        source_kind="manager",
        created_in_session_id="S1",
    )

    result = await invoke_situ_tool(
        tool=SearchEverythingTool(), deps=deps, query="TLS preconnect"
    )
    assert result.success is True
    assert [a["id"] for a in result.analyses] == ["A1"]
    assert [t["id"] for t in result.tasks] == ["T1"]
    assert result.hypotheses == []
    activity_kinds = {a["activity_kind"] for a in result.activities}
    assert "analysis_activity" in activity_kinds
    assert "baseline_activity" in activity_kinds
    assert "experiment_activity" in activity_kinds
    for activity in result.activities:
        assert "activity_kind" in activity
        assert "snippet" in activity
    assert result.total_hits == (
        len(result.analyses) + len(result.hypotheses) + len(result.experiments)
        + len(result.baselines) + len(result.evaluations) + len(result.measurements)
        + len(result.tasks) + len(result.activities)
    )
    assert result.total_hits >= 3


async def test_search_everything_scopes_to_current_project(
    repos: Repositories,
) -> None:
    workspace = await repos.workspaces.ensure()
    await repos.projects.create(
        project_id="P2",
        workspace_id=workspace.id,
        title="Other",
        objective="o",
        research_context="r",
    )
    await repos.sessions.create(
        session_id="S2",
        workspace_id=workspace.id,
        project_id="P2",
    )
    await repos.analyses.create(
        analysis_id="A1",
        project_id="P2",
        title="Other-project signature_phrase_omega",
        summary="Should not surface in P1 search.",
        content="Other-project body with signature_phrase_omega.",
        created_in_session_id="S2",
    )

    p1_deps = SituToolDeps(session_id="S1", repos=repos)
    result = await invoke_situ_tool(
        tool=SearchEverythingTool(), deps=p1_deps, query="signature_phrase_omega"
    )
    assert result.success is True
    assert result.total_hits == 0


async def test_search_everything_handles_unmatched_query_cleanly(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    result = await invoke_situ_tool(
        tool=SearchEverythingTool(), deps=deps, query="!@#$"
    )
    assert result.success is True
    assert result.total_hits == 0


async def test_search_normalizer_handles_special_characters(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await invoke_situ_tool(
        tool=CreateAnalysisTool(),
        deps=deps,
        title="Cold-start TLS notes",
        summary="The cold-start phase uses TLS 1.3 by default.",
        content="During cold-start, TLS 1.3 handshakes can run a single round-trip.",
    )

    hyphen = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="cold-start"
    )
    assert [a["id"] for a in hyphen.analyses] == ["A1"]

    junk = await invoke_situ_tool(
        tool=SearchAnalysesTool(), deps=deps, query="!@#$"
    )
    assert junk.success is True
    assert junk.analyses == []


async def test_list_tools_ignore_project_id_overrides(
    repos: Repositories,
) -> None:
    workspace = await repos.workspaces.ensure()
    await repos.projects.create(
        project_id="P2",
        workspace_id=workspace.id,
        title="Other project",
        objective="Different.",
        research_context="Different.",
    )
    await repos.sessions.create(
        session_id="S2",
        workspace_id=workspace.id,
        project_id="P2",
    )
    await repos.analyses.create(
        analysis_id="A1",
        project_id="P2",
        title="P2 only",
        summary="Should never surface in P1 session.",
        content="P2 body.",
        created_in_session_id="S2",
    )

    deps = SituToolDeps(session_id="S1", repos=repos)

    # Even when a caller passes project_id="P2", the tool must use S1's
    # current project (P1) and not return P2 records.
    listed = await invoke_situ_tool(
        tool=ListAnalysesTool(),
        deps=deps,
        project_id="P2",
    )
    assert all(a["project_id"] == "P1" for a in listed.analyses)
    assert "A1" not in {a["id"] for a in listed.analyses}


async def test_submit_experiment_transitions_active_to_in_review(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    await repos.experiments.update(experiment_id="EX1", status="active")

    submitted = await invoke_situ_tool(
        tool=SubmitExperimentTool(),
        deps=deps,
        experiment_id="EX1",
        comment="All measurements recorded.",
    )

    assert submitted.success is True
    assert submitted.experiment is not None
    assert submitted.experiment["status"] == "in_review"
    activities = await repos.experiment_activities.list_for_experiment(
        experiment_id="EX1"
    )
    kinds = [a.kind for a in activities]
    assert "status_updated" in kinds
    assert "comment" in kinds
    assert [event["type"] for event in emitted] == ["experiment.in_review"]


async def test_submit_experiment_rejects_non_active_source(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)

    result = await invoke_situ_tool(
        tool=SubmitExperimentTool(),
        deps=deps,
        experiment_id="EX1",
    )

    assert result.success is False
    assert result.error is not None
    assert "in_review" not in result.error.message or "active" in result.error.message


async def test_complete_experiment_transitions_in_review_to_done(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    await repos.experiments.update(experiment_id="EX1", status="in_review")

    completed = await invoke_situ_tool(
        tool=CompleteExperimentTool(),
        deps=deps,
        experiment_id="EX1",
        comment="Evidence looks solid.",
    )

    assert completed.success is True
    assert completed.experiment is not None
    assert completed.experiment["status"] == "done"
    assert [event["type"] for event in emitted] == ["experiment.done"]


async def test_complete_experiment_rejects_active_source(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await repos.experiments.update(experiment_id="EX1", status="active")

    result = await invoke_situ_tool(
        tool=CompleteExperimentTool(),
        deps=deps,
        experiment_id="EX1",
    )

    assert result.success is False
    assert result.error is not None
    assert "in_review" in result.error.message


async def test_submit_baseline_transitions_active_to_in_review(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
        status="active",
    )

    submitted = await invoke_situ_tool(
        tool=SubmitBaselineTool(),
        deps=deps,
        baseline_id=baseline.id,
        comment="Baseline evidence is ready for review.",
    )

    assert submitted.success is True
    assert submitted.baseline is not None
    assert submitted.baseline["status"] == "in_review"
    activities = await invoke_situ_tool(
        tool=ListBaselineActivitiesTool(),
        deps=deps,
        baseline_id=baseline.id,
    )
    assert [activity["kind"] for activity in activities.activities] == [
        "status_updated",
        "comment",
    ]
    assert activities.activities[0]["payload"] == {
        "from_status": "active",
        "to_status": "in_review",
    }
    assert activities.activities[1]["body"] == "Baseline evidence is ready for review."
    assert [event["type"] for event in emitted] == ["baseline.in_review"]
    assert emitted[0]["payload"] == {"baseline_id": baseline.id}


async def test_submit_baseline_submits_active_associated_evaluations(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
        status="active",
    )
    evaluation = await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Project eval",
        summary="Run evals.",
        associated_baseline_id=baseline.id,
        status="active",
    )

    submitted = await invoke_situ_tool(
        tool=SubmitBaselineTool(),
        deps=deps,
        baseline_id=baseline.id,
        comment="Baseline evidence is ready for review.",
    )

    refreshed_evaluation = await repos.evaluations.get(evaluation_id=evaluation.id)
    evaluation_activities = await invoke_situ_tool(
        tool=ListEvaluationActivitiesTool(),
        deps=deps,
        evaluation_id=evaluation.id,
    )

    assert submitted.success is True
    assert refreshed_evaluation is not None
    assert refreshed_evaluation.status == "in_review"
    assert [activity["payload"] for activity in evaluation_activities.activities] == [
        {
            "from_status": "active",
            "to_status": "in_review",
            "baseline_id": baseline.id,
        }
    ]
    assert [event["type"] for event in emitted] == [
        "baseline.in_review",
        "evaluation.in_review",
    ]


async def test_complete_baseline_transitions_in_review_to_done(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
        status="in_review",
    )

    completed = await invoke_situ_tool(
        tool=CompleteBaselineTool(),
        deps=deps,
        baseline_id=baseline.id,
        comment="Baseline is reliable enough for comparison.",
    )

    assert completed.success is True
    assert completed.baseline is not None
    assert completed.baseline["status"] == "done"
    activities = await invoke_situ_tool(
        tool=ListBaselineActivitiesTool(),
        deps=deps,
        baseline_id=baseline.id,
    )
    assert [activity["kind"] for activity in activities.activities] == [
        "status_updated",
        "comment",
    ]
    assert activities.activities[0]["payload"] == {
        "from_status": "in_review",
        "to_status": "done",
    }
    assert activities.activities[1]["body"] == "Baseline is reliable enough for comparison."
    assert [event["type"] for event in emitted] == ["baseline.done"]
    assert emitted[0]["payload"] == {"baseline_id": baseline.id}


async def test_complete_baseline_terminalizes_associated_evaluations(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    baseline = await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
        status="in_review",
    )
    active_evaluation = await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Primary baseline eval",
        summary="Run evals.",
        associated_baseline_id=baseline.id,
        status="active",
    )
    review_evaluation = await repos.evaluations.create(
        evaluation_id="EV2",
        project_id="P1",
        created_in_session_id="S1",
        title="Replicate baseline eval",
        summary="Run evals again.",
        associated_baseline_id=baseline.id,
        status="in_review",
    )

    completed = await invoke_situ_tool(
        tool=CompleteBaselineTool(),
        deps=deps,
        baseline_id=baseline.id,
        comment="Baseline is reliable enough for comparison.",
    )

    refreshed_active = await repos.evaluations.get(
        evaluation_id=active_evaluation.id,
    )
    refreshed_review = await repos.evaluations.get(
        evaluation_id=review_evaluation.id,
    )
    active_activities = await invoke_situ_tool(
        tool=ListEvaluationActivitiesTool(),
        deps=deps,
        evaluation_id=active_evaluation.id,
    )
    review_activities = await invoke_situ_tool(
        tool=ListEvaluationActivitiesTool(),
        deps=deps,
        evaluation_id=review_evaluation.id,
    )

    assert completed.success is True
    assert completed.baseline is not None
    assert completed.baseline["status"] == "done"
    assert refreshed_active is not None
    assert refreshed_active.status == "done"
    assert refreshed_review is not None
    assert refreshed_review.status == "done"
    assert active_activities.activities[0]["payload"] == {
        "from_status": "active",
        "to_status": "done",
        "baseline_id": baseline.id,
    }
    assert review_activities.activities[0]["payload"] == {
        "from_status": "in_review",
        "to_status": "done",
        "baseline_id": baseline.id,
    }
    assert [event["type"] for event in emitted] == [
        "baseline.done",
        "evaluation.done",
        "evaluation.done",
    ]


async def test_complete_baseline_rejects_active_source(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
        status="active",
    )

    result = await invoke_situ_tool(
        tool=CompleteBaselineTool(),
        deps=deps,
        baseline_id="B1",
    )

    assert result.success is False
    assert result.error is not None
    assert "in_review" in result.error.message


async def test_baseline_review_transitions_write_activity_records(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Proposed baseline",
        summary="Measurement design.",
        status="triage",
    )
    await repos.baselines.create(
        baseline_id="B2",
        project_id="P1",
        created_in_session_id="S1",
        title="Unusable baseline",
        summary="Cannot compare.",
        status="accepted",
    )
    await repos.baselines.create(
        baseline_id="B3",
        project_id="P1",
        created_in_session_id="S1",
        title="Failed baseline",
        summary="Command failed.",
        status="in_review",
    )

    accepted = await invoke_situ_tool(
        tool=AcceptBaselineTool(),
        deps=deps,
        baseline_id="B1",
        comment="The baseline plan is sound.",
    )
    canceled = await invoke_situ_tool(
        tool=CancelBaselineTool(),
        deps=deps,
        baseline_id="B2",
        comment="The setup is not comparable.",
    )
    failed = await invoke_situ_tool(
        tool=FailBaselineTool(),
        deps=deps,
        baseline_id="B3",
        comment="The command errored before producing metrics.",
    )

    assert accepted.success is True
    assert accepted.baseline is not None
    assert accepted.baseline["status"] == "accepted"
    assert canceled.success is True
    assert canceled.baseline is not None
    assert canceled.baseline["status"] == "canceled"
    assert failed.success is True
    assert failed.baseline is not None
    assert failed.baseline["status"] == "failed"

    project_activities = await invoke_situ_tool(
        tool=ListBaselineActivitiesTool(),
        deps=deps,
    )
    assert [activity["kind"] for activity in project_activities.activities] == [
        "status_updated",
        "comment",
        "status_updated",
        "comment",
        "status_updated",
        "comment",
    ]
    assert [activity["payload"] for activity in project_activities.activities[::2]] == [
        {"from_status": "triage", "to_status": "accepted"},
        {"from_status": "accepted", "to_status": "canceled"},
        {"from_status": "in_review", "to_status": "failed"},
    ]


async def test_submit_evaluation_transitions_active_to_in_review(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
    )
    evaluation = await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Project eval",
        summary="Run evals.",
        associated_baseline_id="B1",
        status="active",
    )

    submitted = await invoke_situ_tool(
        tool=SubmitEvaluationTool(),
        deps=deps,
        evaluation_id=evaluation.id,
    )

    assert submitted.success is True
    assert submitted.evaluation is not None
    assert submitted.evaluation["status"] == "in_review"
    assert [event["type"] for event in emitted] == ["evaluation.in_review"]


async def test_complete_evaluation_transitions_in_review_to_done(
    repos: Repositories,
) -> None:
    emitted: list[dict[str, Any]] = []
    deps = SituToolDeps(
        session_id="S1",
        repos=repos,
        emit_event=_event_collector(emitted),
    )

    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
    )
    evaluation = await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Project eval",
        summary="Run evals.",
        associated_baseline_id="B1",
        status="in_review",
    )

    completed = await invoke_situ_tool(
        tool=CompleteEvaluationTool(),
        deps=deps,
        evaluation_id=evaluation.id,
    )

    assert completed.success is True
    assert completed.evaluation is not None
    assert completed.evaluation["status"] == "done"
    assert [event["type"] for event in emitted] == ["evaluation.done"]


async def test_complete_evaluation_rejects_active_source(
    repos: Repositories,
) -> None:
    deps = SituToolDeps(session_id="S1", repos=repos)
    await repos.baselines.create(
        baseline_id="B1",
        project_id="P1",
        created_in_session_id="S1",
        title="Reference baseline",
        summary="Before changes.",
    )
    await repos.evaluations.create(
        evaluation_id="EV1",
        project_id="P1",
        created_in_session_id="S1",
        title="Project eval",
        summary="Run evals.",
        associated_baseline_id="B1",
        status="active",
    )

    result = await invoke_situ_tool(
        tool=CompleteEvaluationTool(),
        deps=deps,
        evaluation_id="EV1",
    )

    assert result.success is False
    assert result.error is not None
    assert "in_review" in result.error.message


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
