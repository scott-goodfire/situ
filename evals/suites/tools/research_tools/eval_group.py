from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.harness import BaseSituEvalGroup
from evals.suites.tools.research_tools.cases import research_tool_cases
from evals.worlds.research_session import (
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
    run_research_tool_agent,
)


class ResearchToolsEvalGroup(
    BaseSituEvalGroup[ResearchToolEvalInput, ResearchToolEvalOutput]
):
    suite_name: ClassVar[str] = "tools"
    world_name: ClassVar[str] = "research_tools"

    def task(self, args: ResearchToolEvalInput) -> ResearchToolEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("seed", args.seed)
        output = run_research_tool_agent(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("events", len(output.events))
        increment_eval_metric(
            "hypotheses",
            len(output.session_graph.get("hypotheses", [])),
        )
        increment_eval_metric(
            "experiments",
            len(output.session_graph.get("experiments", [])),
        )
        return output

    def eval_cases(self) -> list[Case[ResearchToolEvalInput, ResearchToolEvalOutput]]:
        return research_tool_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []
