from __future__ import annotations

from pathlib import Path
from typing import ClassVar, Sequence

from pydantic_evals import set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.framework.evaluators import (
    EventWasEmitted,
    ProjectBoardContains,
    ToolArgsContain,
    ToolCalledSuccessfully,
    ToolResultContains,
)
from evals.suites.tools.research_tools.evaluators import ProjectBoardHasLink
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
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        EventWasEmitted,
        ProjectBoardContains,
        ProjectBoardHasLink,
        ToolArgsContain,
        ToolCalledSuccessfully,
        ToolResultContains,
    )

    async def task(self, args: ResearchToolEvalInput) -> ResearchToolEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        set_eval_attribute("toolset", args.toolset)
        output = await run_research_tool_agent(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("events", len(output.events))
        increment_eval_metric(
            "hypotheses",
            len(output.project_board.get("hypotheses", [])),
        )
        increment_eval_metric(
            "experiments",
            len(output.project_board.get("experiments", [])),
        )
        return output
