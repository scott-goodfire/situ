from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.suites.agents.research_agent.repo_bootstrap.cases import (
    repo_bootstrap_cases,
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

    async def task(self, args: RepoBootstrapEvalInput) -> RepoBootstrapEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("seed", args.seed)
        output = await run_repo_bootstrap_agent(args)
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
        increment_eval_metric(
            "evaluations",
            len(output.project_board.get("evaluations", [])),
        )
        increment_eval_metric(
            "evaluation_activities",
            len(output.project_board.get("evaluation_activities", [])),
        )
        increment_eval_metric(
            "changed_files",
            len(output.changed_files),
        )
        return output

    def eval_cases(self) -> list[Case[RepoBootstrapEvalInput, RepoBootstrapEvalOutput]]:
        return repo_bootstrap_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []
