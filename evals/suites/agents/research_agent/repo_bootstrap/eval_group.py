from __future__ import annotations

from pathlib import Path
from typing import ClassVar, Sequence

from pydantic_evals import set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.framework.evaluators import (
    ChangedFilesDoNotInclude,
    ProjectOverviewContains,
    ToolArgsContain,
    ToolCalledSuccessfully,
    ToolCallOrder,
    ToolResultContains,
    ToolWasCalled,
)
from evals.suites.agents.research_agent.repo_bootstrap.evaluators import (
    EvaluationResultLinkedToExperiment,
)
from evals.worlds.repo_bootstrap import (
    RepoBootstrapEvalInput,
    RepoBootstrapEvalOutput,
    run_repo_bootstrap_agent,
)


class ResearchAgentRepoBootstrapEvalGroup(
    BaseSituEvalGroup[RepoBootstrapEvalInput, RepoBootstrapEvalOutput]
):
    suite_name: ClassVar[str] = "agents"
    world_name: ClassVar[str] = "research_agent_repo_bootstrap"
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        ChangedFilesDoNotInclude,
        EvaluationResultLinkedToExperiment,
        ProjectOverviewContains,
        ToolArgsContain,
        ToolCalledSuccessfully,
        ToolCallOrder,
        ToolResultContains,
        ToolWasCalled,
    )

    async def task(self, args: RepoBootstrapEvalInput) -> RepoBootstrapEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        output = await run_repo_bootstrap_agent(args)
        increment_eval_metric("tool_calls", len(output.captured_tool_calls))
        increment_eval_metric("events", len(output.events))
        increment_eval_metric(
            "hypotheses",
            len(output.project_overview.get("hypotheses", [])),
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
            "measurements",
            len(output.project_overview.get("measurements", [])),
        )
        increment_eval_metric(
            "changed_files",
            len(output.changed_files),
        )
        return output
