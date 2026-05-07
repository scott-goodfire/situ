from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.harness import BaseSituEvalGroup
from evals.suites.agents.multi_agent_loop.cases import multi_agent_loop_cases
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

    def task(self, args: MultiAgentLoopEvalInput) -> MultiAgentLoopEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("seed", args.seed)
        output = run_multi_agent_loop(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("manager_tool_calls", len(output.manager_tool_calls))
        increment_eval_metric(
            "final_manager_tool_calls",
            len(output.final_manager_tool_calls),
        )
        increment_eval_metric("researcher_tool_calls", len(output.researcher_tool_calls))
        increment_eval_metric("scientist_tool_calls", len(output.scientist_tool_calls))
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("tasks", len(output.project_board.get("tasks", [])))
        increment_eval_metric(
            "done_tasks",
            len(
                [
                    task
                    for task in output.project_board.get("tasks", [])
                    if task.get("status") == "done"
                ]
            ),
        )
        increment_eval_metric(
            "evaluations",
            len(output.project_board.get("evaluations", [])),
        )
        increment_eval_metric(
            "evaluation_activities",
            len(output.project_board.get("evaluation_activities", [])),
        )
        increment_eval_metric("changed_files", len(output.changed_files))
        return output

    def eval_cases(self) -> list[Case[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput]]:
        return multi_agent_loop_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []
