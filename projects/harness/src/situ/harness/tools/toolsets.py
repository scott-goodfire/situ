from __future__ import annotations

import inspect
from typing import cast

from pydantic_ai import FunctionToolset
from pydantic_ai_backends import READONLY_RULESET, create_console_toolset

from .activities import (
    ListAnalysisActivitiesTool,
    ListEvaluationActivitiesTool,
    ListExperimentActivitiesTool,
    ListHypothesisActivitiesTool,
)
from .artifacts import CreateArtifactTool, ListArtifactsTool
from .baselines import CreateBaselineTool, ListBaselinesTool, UpdateBaselineTool
from .analyses import CreateAnalysisTool, ListAnalysesTool, UpdateAnalysisTool
from .comments import (
    AddAnalysisCommentTool,
    AddExperimentCommentTool,
    AddExperimentLineageDecisionTool,
    AddExperimentReviewTool,
    AddHypothesisCommentTool,
)
from .evaluations import (
    AddEvaluationResultTool,
    CreateEvaluationTool,
    ListEvaluationsTool,
    UpdateEvaluationTool,
)
from .experiments import (
    CreateExperimentTool,
    ListExperimentsTool,
    RunExperimentTool,
    UpdateExperimentTool,
)
from .hypotheses import (
    CreateHypothesisTool,
    ListHypothesesTool,
    ResolveHypothesisTool,
    UpdateHypothesisTool,
)
from .common import SituToolDeps
from .links import LinkHypothesisExperimentTool
from .measurements import ListMeasurementsTool
from .projects import (
    ConfirmProjectCloseTool,
    CreateProjectTool,
    GetProjectTool,
    RequestProjectCloseTool,
    UpdateProjectTool,
)
from .project_board import GetProjectBoardTool
from .tasks import (
    AddTaskCommentTool,
    ClaimTaskTool,
    CreateTaskTool,
    GetTaskTool,
    GetTaskBoardTool,
    LinkTaskEntityTool,
    UpdateTaskTool,
)
from .workspace_state import InspectWorkspaceStateTool

RESEARCH_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset reads and writes Situ research records.

    On kickoff, make sure the current run has a project when the objective and
    research context are known. Use `create_project` if the run is projectless,
    and `update_project` when the project objective or research context needs
    refinement.

    If the prompt gives you task IDs, first read each assigned task with
    `get_task(task_id=...)`. Use `get_project_board` when you need the current
    board: hypotheses, analyses, baselines, experiments, evaluations,
    measurements, activities, artifacts, and events.
    Use analysis tools for codebase/domain understanding before it becomes a
    hypothesis. Use the hypothesis, experiment, and evaluation tools to keep
    the research structure clear.

    Use task tools for coordination: inspect the task board, file focused work,
    read assigned task IDs, leave task comments, update task status, and link
    tasks to the research records they produce. Prefer explicit task IDs over
    implicit task selection.

    Use comments for durable research judgment: an interpretation, a risk, a
    useful decision, raw command evidence, or a next step. Avoid comments that
    only narrate routine tool use.

    Before treating candidate experiments as comparable, create or select a
    baseline, create an evaluation associated with that baseline, and record
    measurement evidence with `add_evaluation_result`. Use evaluations as named
    checks, measurements for concrete observed results, and experiments for the
    attempted change. When recording metrics, use stable keys under
    `payload.metrics` and a typed value object such as
    `{"score": {"value": 0.73, "direction": "higher_is_better"}}`.

    Use `inspect_workspace_state` before baseline interpretation and after
    candidate changes. Record dirty starts, changed tests/evals, dependency
    changes, generated-file clutter, branch, commit, and eval command when they
    affect comparability.

    To inspect files or run project-native commands, use the workspace console
    tools. During an active experiment task, those tools are rooted in the
    managed experiment worktree. Keep Situ responsible for project state and the
    workspace tools responsible for bash/filesystem interaction.
    """
)

RESEARCHER_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Situ researcher surface.

    Use it to turn codebase/domain inspection, prior evidence, and evaluation
    observations into durable analyses and hypotheses. Prefer `create_analysis`
    before creating hypotheses when the finding is still broad, contextual, or
    exploratory.

    If the prompt gives you an assigned task ID, call `get_task(task_id=...)`
    before doing the work. Use the task content, payload, links, dependencies,
    and comments returned by that explicit read as the focus for the pass.

    Researcher work should not create candidate experiments or record
    measurement results directly. Use task comments and task entity links to
    make handoffs clear, and mark the active research task done when the
    focused analysis or hypothesis work is complete.
    """
)

MANAGER_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Situ manager surface.

    If the prompt gives you an assigned planning task ID, call
    `get_task(task_id=...)` first. Use this toolset to inspect the current
    project board; create or update the project when kickoff context requires it; file focused
    tasks; add coordination comments; and update the current planning task. Do
    not use the manager pass to run experiments or create new research outputs
    directly; file Researcher or Scientist tasks for that work. Hypothesis
    resolution at close time is the narrow exception.

    When acting on a Critic review for a candidate experiment, record the
    portfolio decision on that experiment with
    `add_experiment_lineage_decision` before creating the next task. Put the
    same `research_thread`, `parent_experiment_id`, and `base_commit` context
    into descendant Scientist experiment tasks when they should continue,
    fork, or reproduce prior work.

    To end a project, use the explicit close handshake. First call
    `request_project_close`, read its warning, and try to keep going unless you
    are confident no useful Scientist task remains. If the warning reports
    unresolved hypotheses, resolve them with `resolve_hypothesis` or explain
    why they should remain open. Only if closing is still warranted should you
    call `confirm_project_close` with the returned code. Do not try to close a
    project with `update_project`.
    """
)

CRITIC_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Situ critic surface.

    Use it to review a completed candidate experiment as the proposed change.
    If the prompt gives you an assigned review task ID, call
    `get_task(task_id=...)` first. Read the experiment, linked task,
    evaluations, measurements, artifacts,
    workspace-state activities, and prior concerns before writing judgment.
    Focus on whether the recorded evidence is decision-grade, suspicious,
    invalid, or needs reproduction.

    Look specifically for seed hacking, selection on noisy measurements,
    adaptive overfitting to the same evaluation surface, greedy hill-climbing
    that discards useful partial results too early, and comparability breaks
    such as changed tests, evals, fixtures, dependencies, toolchains, commands,
    or result shapes.

    Write exactly one experiment review with `add_experiment_review` for the
    active review task unless the task is blocked. Use experiment comments only
    for extra context that should remain separate from the review. Link the
    active task to the experiment, evaluations, measurements, or artifacts that
    were central to the review, and mark the review task done when complete.
    """
)

WORKSPACE_EXECUTE_DESCRIPTION = inspect.cleandoc(
    """
    Execute a project-native shell command in the workspace.

    Use this for ordinary project commands: tests, evals, benchmarks, scripts,
    package-manager commands, and quick environment probes. Treat the returned
    output as plaintext evidence. Do not deterministically parse metrics from
    it inside the tool layer; when the output matters, record the raw text and
    a concise LLM interpretation with `add_evaluation_result`. When an
    experiment task is active, this command runs inside that experiment's
    managed worktree.

    Do not create scratch logs in the selected workspace. The command
    environment includes `SITU_ARTIFACT_DIR` and `SITU_RUN_LOG` under Situ's
    local runtime state for redirected output. If project instructions mention
    `run.log`, treat it as scratch output and use `SITU_RUN_LOG` instead; the
    workspace command backend also routes bare `run.log` references there.
    Situ records a command receipt artifact for executed commands when project
    state is available.
    """
)


def build_researcher_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.researcher.v1",
        instructions=RESEARCHER_TOOLSET_INSTRUCTIONS,
        tools=[
            GetProjectBoardTool().as_tool(),
            GetProjectTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskBoardTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            LinkTaskEntityTool().as_tool(),
            InspectWorkspaceStateTool().as_tool(),
            ListAnalysesTool().as_tool(),
            CreateAnalysisTool().as_tool(),
            UpdateAnalysisTool().as_tool(),
            ListHypothesesTool().as_tool(),
            CreateHypothesisTool().as_tool(),
            UpdateHypothesisTool().as_tool(),
            ListBaselinesTool().as_tool(),
            ListExperimentsTool().as_tool(),
            ListEvaluationsTool().as_tool(),
            ListMeasurementsTool().as_tool(),
            AddAnalysisCommentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
            ListAnalysisActivitiesTool().as_tool(),
            ListHypothesisActivitiesTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            ListEvaluationActivitiesTool().as_tool(),
            ListArtifactsTool().as_tool(),
        ],
    )


def build_scientist_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.scientist.v1",
        instructions=RESEARCH_TOOLSET_INSTRUCTIONS,
        tools=[
            GetProjectBoardTool().as_tool(),
            GetProjectTool().as_tool(),
            CreateProjectTool().as_tool(),
            UpdateProjectTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskBoardTool().as_tool(),
            CreateTaskTool().as_tool(),
            ClaimTaskTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            LinkTaskEntityTool().as_tool(),
            InspectWorkspaceStateTool().as_tool(),
            ListAnalysesTool().as_tool(),
            CreateAnalysisTool().as_tool(),
            UpdateAnalysisTool().as_tool(),
            ListHypothesesTool().as_tool(),
            CreateHypothesisTool().as_tool(),
            UpdateHypothesisTool().as_tool(),
            ListBaselinesTool().as_tool(),
            CreateBaselineTool().as_tool(),
            UpdateBaselineTool().as_tool(),
            ListExperimentsTool().as_tool(),
            CreateExperimentTool().as_tool(),
            UpdateExperimentTool().as_tool(),
            RunExperimentTool().as_tool(),
            ListEvaluationsTool().as_tool(),
            CreateEvaluationTool().as_tool(),
            UpdateEvaluationTool().as_tool(),
            ListMeasurementsTool().as_tool(),
            LinkHypothesisExperimentTool().as_tool(),
            AddAnalysisCommentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
            AddExperimentCommentTool().as_tool(),
            AddEvaluationResultTool().as_tool(),
            ListAnalysisActivitiesTool().as_tool(),
            ListHypothesisActivitiesTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            ListEvaluationActivitiesTool().as_tool(),
            CreateArtifactTool().as_tool(),
            ListArtifactsTool().as_tool(),
        ],
    )


def build_research_toolset() -> FunctionToolset[SituToolDeps]:
    return build_scientist_toolset()


def build_manager_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.manager.v1",
        instructions=MANAGER_TOOLSET_INSTRUCTIONS,
        tools=[
            GetProjectBoardTool().as_tool(),
            GetProjectTool().as_tool(),
            CreateProjectTool().as_tool(),
            UpdateProjectTool().as_tool(),
            RequestProjectCloseTool().as_tool(),
            ConfirmProjectCloseTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskBoardTool().as_tool(),
            CreateTaskTool().as_tool(),
            ClaimTaskTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            ResolveHypothesisTool().as_tool(),
            AddExperimentLineageDecisionTool().as_tool(),
        ],
    )


def build_critic_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.critic.v1",
        instructions=CRITIC_TOOLSET_INSTRUCTIONS,
        tools=[
            GetProjectBoardTool().as_tool(),
            GetProjectTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskBoardTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            LinkTaskEntityTool().as_tool(),
            InspectWorkspaceStateTool().as_tool(),
            ListAnalysesTool().as_tool(),
            ListHypothesesTool().as_tool(),
            ListBaselinesTool().as_tool(),
            ListExperimentsTool().as_tool(),
            ListEvaluationsTool().as_tool(),
            ListMeasurementsTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            ListEvaluationActivitiesTool().as_tool(),
            ListArtifactsTool().as_tool(),
            AddExperimentCommentTool().as_tool(),
            AddExperimentReviewTool().as_tool(),
        ],
    )


def build_workspace_toolset() -> FunctionToolset[SituToolDeps]:
    return cast(
        FunctionToolset[SituToolDeps],
        create_console_toolset(
            id="situ.workspace.v1",
            include_execute=True,
            require_write_approval=False,
            require_execute_approval=False,
            default_ignore_hidden=True,
            descriptions={
                "execute": WORKSPACE_EXECUTE_DESCRIPTION,
            },
        ),
    )


def build_workspace_readonly_toolset() -> FunctionToolset[SituToolDeps]:
    return cast(
        FunctionToolset[SituToolDeps],
        create_console_toolset(
            id="situ.workspace.readonly.v1",
            include_execute=True,
            permissions=READONLY_RULESET,
            default_ignore_hidden=True,
        ),
    )
