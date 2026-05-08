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
    ExperimentTasksHaveHypothesisLinks,
    ProjectOverviewContains,
)
from evals.suites.agents.app_session_loop.evaluators import (
    BaselineThenFollowupWork,
    CommandReceiptArtifactCaptured,
    DoneTaskKindAtLeast,
    ExperimentCandidateStateRecorded,
    ExperimentCountAtLeast,
    ExperimentReviewRecorded,
    ManagerCompletedAfterCriticReview,
    PatchHandoffArtifactCaptured,
    PlanningPassCountAtLeast,
    RecordCountAtLeast,
    ReviewLaneCleared,
    TaskDoneByAgentKind,
)
from evals.worlds.app_session_loop import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
    run_app_session_loop,
)


class AppSessionLoopEvalGroup(
    BaseSituEvalGroup[AppSessionLoopEvalInput, AppSessionLoopEvalOutput]
):
    suite_name: ClassVar[str] = "agents"
    world_name: ClassVar[str] = "app_session_loop"
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        BaselineThenFollowupWork,
        ChangedFilesDoNotInclude,
        ChangedFilesExactly,
        CommandReceiptArtifactCaptured,
        DoneTaskKindAtLeast,
        EventWasEmitted,
        ExperimentCandidateStateRecorded,
        ExperimentCountAtLeast,
        ExperimentTasksHaveHypothesisLinks,
        ExperimentReviewRecorded,
        ManagerCompletedAfterCriticReview,
        PatchHandoffArtifactCaptured,
        PlanningPassCountAtLeast,
        ProjectOverviewContains,
        RecordCountAtLeast,
        ReviewLaneCleared,
        TaskDoneByAgentKind,
    )

    async def task(self, args: AppSessionLoopEvalInput) -> AppSessionLoopEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        output = await run_app_session_loop(args)
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("tasks", len(output.project_overview.get("tasks", [])))
        increment_eval_metric("done_tasks", output.signals.get("done_tasks") or 0)
        increment_eval_metric(
            "manager_done_tasks",
            output.signals.get("manager_done_tasks") or 0,
        )
        increment_eval_metric(
            "scientist_done_tasks",
            output.signals.get("scientist_done_tasks") or 0,
        )
        increment_eval_metric(
            "researcher_done_tasks",
            output.signals.get("researcher_done_tasks") or 0,
        )
        increment_eval_metric(
            "critic_done_tasks",
            output.signals.get("critic_done_tasks") or 0,
        )
        increment_eval_metric(
            "scientist_done_tasks_by_agent",
            output.signals.get("scientist_done_tasks_by_agent") or 0,
        )
        increment_eval_metric(
            "experiments",
            len(output.project_overview.get("experiments", [])),
        )
        increment_eval_metric(
            "evaluations",
            len(output.project_overview.get("evaluations", [])),
        )
        increment_eval_metric(
            "artifacts",
            len(output.project_overview.get("artifacts", [])),
        )
        increment_eval_metric(
            "artifact_files",
            len(output.artifact_files),
        )
        increment_eval_metric("changed_files", len(output.changed_files))
        return output
