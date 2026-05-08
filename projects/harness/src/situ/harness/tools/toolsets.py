from __future__ import annotations

import inspect
from typing import cast

from pydantic_ai import FunctionToolset, RunContext
from pydantic_ai_backends import READONLY_RULESET, create_console_toolset

from .activities import (
    ListAnalysisActivitiesTool,
    ListBaselineActivitiesTool,
    ListEvaluationActivitiesTool,
    ListExperimentActivitiesTool,
    ListHypothesisActivitiesTool,
)
from .artifacts import CreateArtifactTool, ListArtifactsTool
from .analyses import (
    AcceptAnalysisTool,
    CancelAnalysisTool,
    CompleteAnalysisTool,
    CreateAnalysisTool,
    FailAnalysisTool,
    GetAnalysisTool,
    ListAnalysesTool,
    SearchAnalysesTool,
    UpdateAnalysisTool,
)
from .analysis_activities import AddAnalysisCommentTool
from .baselines import (
    AcceptBaselineTool,
    CancelBaselineTool,
    CompleteBaselineTool,
    CreateBaselineTool,
    FailBaselineTool,
    GetBaselineTool,
    ListBaselinesTool,
    SearchBaselinesTool,
    SubmitBaselineTool,
    UpdateBaselineTool,
)
from .baseline_activities import AddBaselineCommentTool
from .evaluations import (
    AcceptEvaluationTool,
    CancelEvaluationTool,
    CompleteEvaluationTool,
    CreateEvaluationTool,
    FailEvaluationTool,
    GetEvaluationTool,
    ListEvaluationsTool,
    SearchEvaluationsTool,
    SubmitEvaluationTool,
    UpdateEvaluationTool,
)
from .experiments import (
    AcceptExperimentTool,
    CancelExperimentTool,
    CompleteExperimentTool,
    CreateExperimentTool,
    FailExperimentTool,
    GetExperimentTool,
    ListExperimentsTool,
    SearchExperimentsTool,
    SubmitExperimentTool,
    UpdateExperimentTool,
)
from .experiment_activities import (
    AddExperimentCommentTool,
    AddExperimentLineageDecisionTool,
)
from .hypotheses import (
    AcceptHypothesisTool,
    CancelHypothesisTool,
    CompleteHypothesisTool,
    CreateHypothesisTool,
    FailHypothesisTool,
    GetHypothesisTool,
    ListHypothesesTool,
    ResolveHypothesisTool,
    SearchHypothesesTool,
    UpdateHypothesisTool,
)
from .hypothesis_activities import AddHypothesisCommentTool
from .common import SituToolDeps
from .links import LinkHypothesisExperimentTool
from .measurements import (
    AddMeasurementTool,
    GetMeasurementTool,
    ListMeasurementsTool,
    SearchMeasurementsTool,
)
from .projects import (
    ConfirmProjectCloseTool,
    CreateProjectTool,
    GetProjectTool,
    RequestProjectCloseTool,
    UpdateProjectTool,
)
from .compute import ComputePoolsOverviewTool
from .project_overview import GetProjectOverviewTool
from .search import SearchEverythingTool
from .tasks import (
    AcceptTaskTool,
    CancelTaskTool,
    ClaimTaskTool,
    CompleteTaskTool,
    CreateTaskTool,
    FailTaskTool,
    GetTaskTool,
    GetTaskOverviewTool,
    LinkTaskEntityTool,
    SearchTasksTool,
    UpdateTaskTool,
)
from .task_activities import AddTaskCommentTool
from .workspace_state import InspectWorkspaceStateTool

RESEARCH_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset reads and writes Situ research records.

    Tool surface:
    - Project: `create_project`, `update_project`, `get_project`,
      `get_project_overview`. On kickoff make sure the current run has a project
      when the objective and research context are known.
    - Tasks: `get_task`, `get_task_overview`, `create_task`, `update_task`,
      `claim_task`, `accept_task`, `complete_task`, `cancel_task`, `fail_task`,
      `link_task_entity`, `add_task_comment`, `search_tasks`.
      Read each assigned task explicitly before doing work.
    - Research records: analyses for context, hypotheses for testable claims,
      baselines and experiments for the empirical work, evaluations and
      measurements for the evidence under each. Each record kind has
      `create_*`, `update_*`, `accept_*`, `cancel_*`, `fail_*`, `list_*`,
      `get_*`, and `search_*` tools. Experiments, baselines, and evaluations
      also have `submit_*` (producer finishes: active -> in_review) and
      `complete_*` (Critic finalizes: in_review -> done). Analyses and
      hypotheses use `complete_*` directly (active -> done).
    - Discovery: start with `search_everything` for triage ("is anything in
      this project about X?") — it returns hits grouped by kind across all
      records and activities. Then drill in with the per-entity `search_*`
      tools (BM25-ranked, snippets) or fall back to `list_*` when you need to
      enumerate everything. All discovery tools are scoped to the current
      project — no cross-project access.
    - Activity readers: `list_*_activities` for analyses, hypotheses,
      baselines, experiments, and evaluations.
    - Activity writers: `add_*_comment` for durable judgment, `add_measurement`
      for evaluation evidence. Transition tools add status and verdict
      comments for baselines, experiments, and evaluations.
    - Activity kinds: `comment` carries durable research judgment ("I'm
      not convinced this is signal"). `status_updated` activities are
      emitted automatically by transition tools — do not file one by
      hand. `recorded` is for structured facts (measurement bodies,
      reviews) that the writer wants to mark as more than commentary.
    - `claim_task` atomically claims runnable work. Task transition tools close
      or release assigned work; record transition tools move research records
      through review state.
    - Workspace: `inspect_workspace_state` for git/comparability state, plus
      the workspace console tools for files and project-native commands.
      During an active experiment task those tools are rooted in the managed
      experiment worktree.

    The procedural flow for a baseline or experiment task lives in the
    `baseline-task` and `experiment-task` SKILLs — load the matching SKILL
    before executing one. Use comments only for durable research judgment, not
    routine tool-call narration.
    """
)

RESEARCHER_TOOLSET_INSTRUCTIONS = inspect.cleandoc(
    """
    This toolset is the Situ researcher surface.

    Use it to turn codebase/domain inspection, prior evidence, and evaluation
    observations into durable analyses and hypotheses. Prefer `create_analysis`
    before creating hypotheses when the finding is still broad, contextual, or
    exploratory.

    Before producing new analyses, run `search_everything` for triage and
    follow up with the per-entity `search_*` tools (`search_analyses`,
    `search_hypotheses`, `search_experiments`, `search_measurements`) when you
    need more focused hits. This catches prior work in this project so new
    analyses can extend or supersede the existing ones rather than duplicate
    them. All search tools are scoped to the current project.

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
    project overview; create or update the project when kickoff context requires it; file focused
    tasks; add coordination comments; and update the current planning task. Do
    not use the manager pass to run experiments or create new research outputs
    directly; file Researcher or Scientist tasks for that work. Hypothesis
    resolution at close time is the narrow exception.

    When acting on a Critic review for a candidate experiment, record the
    portfolio decision on that experiment with
    `add_experiment_lineage_decision` before creating the next task. Put the
    same `research_thread`, `parent_experiment_id`, and `base_selector`
    context into descendant Scientist experiment tasks when they should
    continue, fork, or reproduce prior work. Use `base_commit` only with
    `base_selector="explicit_commit"` and an exact Git commit/ref.

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

    Scan the project for records that need review. The status field is the
    queue: `triage` records await admission; `in_review` records await evidence
    vetting after the producer finished work. Use `search_everything` for a
    fast cross-kind scan, then narrow with `search_experiments`,
    `search_baselines`, `search_measurements`, `search_hypotheses`, and
    `search_analyses`. Read the target record's activity trail with the
    matching `list_*_activities` tool. All search tools are scoped to the
    current project.

    Critic transitions by status:
    - `triage` -> `accepted`: `accept_<record>` (admits design/intent)
    - `triage` -> `canceled`: `cancel_<record>` (rejects pre-run)
    - `in_review` -> `done`: `complete_<record>` (vets evidence, finalizes;
      experiments, baselines, evaluations only)
    - `in_review` -> `canceled`: `cancel_<record>` (rejects evidence)

    When a record requires a verdict, act directly via the transition tools
    with a comment that explains the decision. The cancellation is the verdict;
    the comment is the reason; no separate finding record is needed.
    """
)

WORKSPACE_EXECUTE_DESCRIPTION = inspect.cleandoc(
    """
    Execute a project-native shell command in the workspace.

    Use this for ordinary project commands: tests, evals, benchmarks, scripts,
    package-manager commands, and quick environment probes. Treat the returned
    output as plaintext evidence. Do not deterministically parse metrics from
    it inside the tool layer; when the output matters, record the raw text and
    a concise LLM interpretation with `add_measurement`. When an
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
            GetProjectOverviewTool().as_tool(),
            GetProjectTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskOverviewTool().as_tool(),
            AcceptTaskTool().as_tool(),
            CompleteTaskTool().as_tool(),
            CancelTaskTool().as_tool(),
            FailTaskTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            LinkTaskEntityTool().as_tool(),
            SearchTasksTool().as_tool(),
            SearchEverythingTool().as_tool(),
            InspectWorkspaceStateTool().as_tool(),
            ListAnalysesTool().as_tool(),
            GetAnalysisTool().as_tool(),
            CreateAnalysisTool().as_tool(),
            AcceptAnalysisTool().as_tool(),
            CompleteAnalysisTool().as_tool(),
            CancelAnalysisTool().as_tool(),
            FailAnalysisTool().as_tool(),
            UpdateAnalysisTool().as_tool(),
            SearchAnalysesTool().as_tool(),
            ListHypothesesTool().as_tool(),
            GetHypothesisTool().as_tool(),
            CreateHypothesisTool().as_tool(),
            AcceptHypothesisTool().as_tool(),
            CompleteHypothesisTool().as_tool(),
            CancelHypothesisTool().as_tool(),
            FailHypothesisTool().as_tool(),
            UpdateHypothesisTool().as_tool(),
            ResolveHypothesisTool().as_tool(),
            SearchHypothesesTool().as_tool(),
            ListBaselinesTool().as_tool(),
            GetBaselineTool().as_tool(),
            SearchBaselinesTool().as_tool(),
            ListExperimentsTool().as_tool(),
            GetExperimentTool().as_tool(),
            SearchExperimentsTool().as_tool(),
            ListEvaluationsTool().as_tool(),
            GetEvaluationTool().as_tool(),
            SearchEvaluationsTool().as_tool(),
            ListMeasurementsTool().as_tool(),
            GetMeasurementTool().as_tool(),
            SearchMeasurementsTool().as_tool(),
            AddAnalysisCommentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
            ListAnalysisActivitiesTool().as_tool(),
            ListBaselineActivitiesTool().as_tool(),
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
            GetProjectOverviewTool().as_tool(),
            GetProjectTool().as_tool(),
            CreateProjectTool().as_tool(),
            UpdateProjectTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskOverviewTool().as_tool(),
            CreateTaskTool().as_tool(),
            ClaimTaskTool().as_tool(),
            AcceptTaskTool().as_tool(),
            CompleteTaskTool().as_tool(),
            CancelTaskTool().as_tool(),
            FailTaskTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            LinkTaskEntityTool().as_tool(),
            SearchTasksTool().as_tool(),
            SearchEverythingTool().as_tool(),
            InspectWorkspaceStateTool().as_tool(),
            ListAnalysesTool().as_tool(),
            GetAnalysisTool().as_tool(),
            CreateAnalysisTool().as_tool(),
            AcceptAnalysisTool().as_tool(),
            CompleteAnalysisTool().as_tool(),
            CancelAnalysisTool().as_tool(),
            FailAnalysisTool().as_tool(),
            UpdateAnalysisTool().as_tool(),
            SearchAnalysesTool().as_tool(),
            ListHypothesesTool().as_tool(),
            GetHypothesisTool().as_tool(),
            CreateHypothesisTool().as_tool(),
            AcceptHypothesisTool().as_tool(),
            CompleteHypothesisTool().as_tool(),
            CancelHypothesisTool().as_tool(),
            FailHypothesisTool().as_tool(),
            UpdateHypothesisTool().as_tool(),
            SearchHypothesesTool().as_tool(),
            ListBaselinesTool().as_tool(),
            GetBaselineTool().as_tool(),
            CreateBaselineTool().as_tool(),
            AcceptBaselineTool().as_tool(),
            SubmitBaselineTool().as_tool(),
            CancelBaselineTool().as_tool(),
            FailBaselineTool().as_tool(),
            UpdateBaselineTool().as_tool(),
            SearchBaselinesTool().as_tool(),
            ListExperimentsTool().as_tool(),
            GetExperimentTool().as_tool(),
            CreateExperimentTool().as_tool(),
            AcceptExperimentTool().as_tool(),
            SubmitExperimentTool().as_tool(),
            CancelExperimentTool().as_tool(),
            FailExperimentTool().as_tool(),
            UpdateExperimentTool().as_tool(),
            SearchExperimentsTool().as_tool(),
            ListEvaluationsTool().as_tool(),
            GetEvaluationTool().as_tool(),
            CreateEvaluationTool().as_tool(),
            AcceptEvaluationTool().as_tool(),
            SubmitEvaluationTool().as_tool(),
            CancelEvaluationTool().as_tool(),
            FailEvaluationTool().as_tool(),
            UpdateEvaluationTool().as_tool(),
            SearchEvaluationsTool().as_tool(),
            ListMeasurementsTool().as_tool(),
            GetMeasurementTool().as_tool(),
            SearchMeasurementsTool().as_tool(),
            LinkHypothesisExperimentTool().as_tool(),
            AddAnalysisCommentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
            AddExperimentCommentTool().as_tool(),
            AddBaselineCommentTool().as_tool(),
            AddMeasurementTool().as_tool(),
            ListAnalysisActivitiesTool().as_tool(),
            ListBaselineActivitiesTool().as_tool(),
            ListHypothesisActivitiesTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            ListEvaluationActivitiesTool().as_tool(),
            CreateArtifactTool().as_tool(),
            ListArtifactsTool().as_tool(),
        ],
    )


def build_manager_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.manager.v1",
        instructions=MANAGER_TOOLSET_INSTRUCTIONS,
        tools=[
            GetProjectOverviewTool().as_tool(),
            GetProjectTool().as_tool(),
            CreateProjectTool().as_tool(),
            UpdateProjectTool().as_tool(),
            RequestProjectCloseTool().as_tool(),
            ConfirmProjectCloseTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskOverviewTool().as_tool(),
            CreateTaskTool().as_tool(),
            ClaimTaskTool().as_tool(),
            AcceptTaskTool().as_tool(),
            CompleteTaskTool().as_tool(),
            CancelTaskTool().as_tool(),
            FailTaskTool().as_tool(),
            UpdateTaskTool().as_tool(),
            AddTaskCommentTool().as_tool(),
            GetHypothesisTool().as_tool(),
            GetExperimentTool().as_tool(),
            GetEvaluationTool().as_tool(),
            ResolveHypothesisTool().as_tool(),
            AddExperimentLineageDecisionTool().as_tool(),
            ComputePoolsOverviewTool().as_tool(),
        ],
    )


def build_critic_toolset() -> FunctionToolset[SituToolDeps]:
    return FunctionToolset[SituToolDeps](
        id="situ.critic.v1",
        instructions=CRITIC_TOOLSET_INSTRUCTIONS,
        tools=[
            GetProjectOverviewTool().as_tool(),
            GetProjectTool().as_tool(),
            GetTaskTool().as_tool(),
            GetTaskOverviewTool().as_tool(),
            SearchTasksTool().as_tool(),
            SearchEverythingTool().as_tool(),
            InspectWorkspaceStateTool().as_tool(),
            ListAnalysesTool().as_tool(),
            GetAnalysisTool().as_tool(),
            AcceptAnalysisTool().as_tool(),
            CancelAnalysisTool().as_tool(),
            SearchAnalysesTool().as_tool(),
            ListHypothesesTool().as_tool(),
            GetHypothesisTool().as_tool(),
            AcceptHypothesisTool().as_tool(),
            CancelHypothesisTool().as_tool(),
            SearchHypothesesTool().as_tool(),
            ListBaselinesTool().as_tool(),
            GetBaselineTool().as_tool(),
            AcceptBaselineTool().as_tool(),
            CompleteBaselineTool().as_tool(),
            CancelBaselineTool().as_tool(),
            SearchBaselinesTool().as_tool(),
            ListExperimentsTool().as_tool(),
            GetExperimentTool().as_tool(),
            AcceptExperimentTool().as_tool(),
            CompleteExperimentTool().as_tool(),
            CancelExperimentTool().as_tool(),
            SearchExperimentsTool().as_tool(),
            ListEvaluationsTool().as_tool(),
            GetEvaluationTool().as_tool(),
            AcceptEvaluationTool().as_tool(),
            CompleteEvaluationTool().as_tool(),
            CancelEvaluationTool().as_tool(),
            SearchEvaluationsTool().as_tool(),
            ListMeasurementsTool().as_tool(),
            GetMeasurementTool().as_tool(),
            SearchMeasurementsTool().as_tool(),
            ListAnalysisActivitiesTool().as_tool(),
            ListBaselineActivitiesTool().as_tool(),
            ListHypothesisActivitiesTool().as_tool(),
            ListExperimentActivitiesTool().as_tool(),
            ListEvaluationActivitiesTool().as_tool(),
            ListArtifactsTool().as_tool(),
            AddExperimentCommentTool().as_tool(),
            AddBaselineCommentTool().as_tool(),
            AddHypothesisCommentTool().as_tool(),
        ],
    )


def build_workspace_toolset() -> FunctionToolset[SituToolDeps]:
    toolset = cast(
        FunctionToolset[SituToolDeps],
        create_console_toolset(
            id="situ.workspace.v1",
            include_execute=False,
            require_write_approval=False,
            default_ignore_hidden=True,
        ),
    )
    _add_execute_tool(toolset, requires_approval=False)
    return toolset


def build_workspace_readonly_toolset() -> FunctionToolset[SituToolDeps]:
    return cast(
        FunctionToolset[SituToolDeps],
        create_console_toolset(
            id="situ.workspace.readonly.v1",
            include_execute=False,
            permissions=READONLY_RULESET,
            default_ignore_hidden=True,
        ),
    )


def _add_execute_tool(
    toolset: FunctionToolset[SituToolDeps],
    *,
    requires_approval: bool,
) -> None:
    @toolset.tool(
        name="execute",
        description=WORKSPACE_EXECUTE_DESCRIPTION,
        requires_approval=requires_approval,
        sequential=True,
    )
    async def execute(
        ctx: RunContext[SituToolDeps],
        command: str,
        timeout: int | None = 120,
    ) -> str:
        """Execute a shell command in the working directory.

        Args:
            command: Shell command to execute.
            timeout: Maximum execution time in seconds.
        """
        try:
            await ctx.deps.require_active_session()
        except RuntimeError as error:
            return f"Error: {error}"

        backend = ctx.deps.backend
        try:
            result = await backend.execute(command, timeout=timeout)
        except RuntimeError as error:
            return f"Error: {error}"

        await ctx.deps.flush_command_receipts()

        output = result.output
        if result.truncated:
            output += "\n\n... (output truncated)"

        if result.exit_code is not None and result.exit_code != 0:
            return f"Command failed (exit code {result.exit_code}):\n{output}"

        return str(output)
