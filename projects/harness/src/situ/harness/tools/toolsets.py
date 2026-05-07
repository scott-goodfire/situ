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
from .sessions import GetSessionTool
from .tasks import (
    AddTaskCommentTool,
    ClaimTaskTool,
    CreateTaskTool,
    GetTaskBoardTool,
    LinkTaskEntityTool,
    UpdateTaskTool,
)
from .workspace_state import InspectWorkspaceStateTool

RESEARCH_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Situ research ledger.

    On session kickoff, make sure the session has a project when the objective
    and research context are known. Use `create_project` if the session is
    projectless, and `update_project` when the project objective or research
    context needs refinement.

    Use `get_session` when you need the current board: hypotheses,
    analyses, baselines, experiments, evaluations, measurements, activities,
    artifacts, and events.
    Use analysis tools for codebase/domain understanding before it becomes a
    hypothesis. Use the hypothesis, experiment, and evaluation tools to keep
    the research structure clear.

    Use task tools for coordination: inspect the task board, file focused work,
    claim eligible work, leave task comments, update task status, and link
    tasks to the ledger records they produce.

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
    managed experiment worktree. Keep Situ responsible for the ledger and the
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

    Researcher work should not create candidate experiments or record
    measurement results directly. Use task comments and task entity links to
    make handoffs clear, and mark the active research task done when the
    focused analysis or hypothesis work is complete.
    """
)

MANAGER_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Situ manager surface.

    Use it to inspect the current session, project, and task board; create or
    update the session project when kickoff context requires it; file focused
    tasks; add coordination comments; and update the current planning task. Do
    not use the manager pass to run experiments or write research outputs
    directly; file Researcher or Scientist tasks for that work.

    To end a project, use the explicit close handshake. First call
    `request_project_close`, read its warning, and try to keep going unless you
    are confident no useful Scientist task remains. Only if closing is still
    warranted should you call `confirm_project_close` with the returned code.
    Do not try to close a project with `update_project`.
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
    """
)


def build_researcher_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.researcher.v1",
        instructions=RESEARCHER_TOOLSET_INSTRUCTIONS,
        tools=[
            GetSessionTool().as_tool(),
            GetProjectTool().as_tool(),
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
            GetSessionTool().as_tool(),
            GetProjectTool().as_tool(),
            CreateProjectTool().as_tool(),
            UpdateProjectTool().as_tool(),
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
            GetSessionTool().as_tool(),
            GetProjectTool().as_tool(),
            CreateProjectTool().as_tool(),
            UpdateProjectTool().as_tool(),
            RequestProjectCloseTool().as_tool(),
            ConfirmProjectCloseTool().as_tool(),
            GetTaskBoardTool().as_tool(),
            CreateTaskTool().as_tool(),
            ClaimTaskTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
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
