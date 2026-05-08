from __future__ import annotations

from pathlib import Path
from typing import ClassVar, Sequence

from pydantic_evals import set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.framework.evaluators import (
    ChangedFilesDoNotInclude,
    ChangedFilesExactly,
    EventWasEmitted,
    ProjectOverviewContains,
    ToolArgsContain,
    ToolResultContains,
    ToolWasCalled,
)
from evals.suites.agents.multi_agent_loop.evaluators import (
    AnalysisRecorded,
    BaselineEvaluationRecorded,
    CandidateExperimentRecorded,
    FollowupTaskCreatedAfterBaseline,
    ResearcherHandoffRecorded,
    RoleToolArgsContain,
    RoleToolCalledSuccessfully,
    RoleToolSucceeded,
    RoleToolWasCalled,
    ScientistCompletedBaselineTask,
    TaskClaimedByRole,
    UserUrgentTaskPreemptedBacklog,
    WebSourceAnalysisRecorded,
)
from evals.worlds.multi_agent_loop import (
    MultiAgentLoopEvalInput,
    MultiAgentLoopEvalOutput,
    run_multi_agent_loop,
)


class MultiAgentLoopEvalGroup(
    BaseSituEvalGroup[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput]
):
    suite_name: ClassVar[str] = "agents"
    world_name: ClassVar[str] = "multi_agent_loop"
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        AnalysisRecorded,
        BaselineEvaluationRecorded,
        CandidateExperimentRecorded,
        ChangedFilesDoNotInclude,
        ChangedFilesExactly,
        EventWasEmitted,
        FollowupTaskCreatedAfterBaseline,
        ProjectOverviewContains,
        ResearcherHandoffRecorded,
        RoleToolArgsContain,
        RoleToolCalledSuccessfully,
        RoleToolSucceeded,
        RoleToolWasCalled,
        ScientistCompletedBaselineTask,
        TaskClaimedByRole,
        ToolArgsContain,
        ToolResultContains,
        ToolWasCalled,
        UserUrgentTaskPreemptedBacklog,
        WebSourceAnalysisRecorded,
    )

    async def task(self, args: MultiAgentLoopEvalInput) -> MultiAgentLoopEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        output = await run_multi_agent_loop(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("manager_tool_calls", len(output.manager_tool_calls))
        increment_eval_metric(
            "final_manager_tool_calls",
            len(output.final_manager_tool_calls),
        )
        increment_eval_metric("researcher_tool_calls", len(output.researcher_tool_calls))
        increment_eval_metric("scientist_tool_calls", len(output.scientist_tool_calls))
        increment_eval_metric(
            "web_search_tool_calls",
            len(
                [
                    call
                    for call in output.captured_tool_calls
                    if call.tool_name == "web_search"
                ]
            ),
        )
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("tasks", len(output.project_overview.get("tasks", [])))
        increment_eval_metric(
            "done_tasks",
            len(
                [
                    task
                    for task in output.project_overview.get("tasks", [])
                    if task.get("status") == "done"
                ]
            ),
        )
        increment_eval_metric(
            "evaluations",
            len(output.project_overview.get("evaluations", [])),
        )
        increment_eval_metric(
            "measurements",
            len(output.project_overview.get("measurements", [])),
        )
        increment_eval_metric("changed_files", len(output.changed_files))
        return output
