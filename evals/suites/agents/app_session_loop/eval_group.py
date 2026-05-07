from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.suites.agents.app_session_loop.cases import app_session_loop_cases
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

    def task(self, args: AppSessionLoopEvalInput) -> AppSessionLoopEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("seed", args.seed)
        output = run_app_session_loop(args)
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("tasks", len(output.project_board.get("tasks", [])))
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
            len(output.project_board.get("experiments", [])),
        )
        increment_eval_metric(
            "evaluations",
            len(output.project_board.get("evaluations", [])),
        )
        increment_eval_metric("changed_files", len(output.changed_files))
        return output

    def eval_cases(self) -> list[Case[AppSessionLoopEvalInput, AppSessionLoopEvalOutput]]:
        return app_session_loop_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []
