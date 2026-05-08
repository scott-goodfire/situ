from __future__ import annotations

from pathlib import Path
from typing import ClassVar, Sequence

from pydantic_evals import set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.framework.evaluators import (
    ContentContains,
    ProjectBoardContains,
    ToolArgsContain,
    ToolCalledSuccessfully,
)
from evals.worlds.research_session import (
    ResearchAgentEvalInput,
    ResearchAgentEvalOutput,
    run_research_agent,
)


class ResearchAgentSessionEvalGroup(
    BaseSituEvalGroup[ResearchAgentEvalInput, ResearchAgentEvalOutput]
):
    suite_name: ClassVar[str] = "agents"
    world_name: ClassVar[str] = "research_agent_research_session"
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        ContentContains,
        ProjectBoardContains,
        ToolArgsContain,
        ToolCalledSuccessfully,
    )

    async def task(self, args: ResearchAgentEvalInput) -> ResearchAgentEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        output = await run_research_agent(args)
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
