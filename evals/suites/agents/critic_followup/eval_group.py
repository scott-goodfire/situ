from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.harness import BaseSituEvalGroup
from evals.suites.agents.critic_followup.cases import critic_followup_cases
from evals.worlds.critic_followup import (
    CriticFollowupEvalInput,
    CriticFollowupEvalOutput,
    run_critic_followup,
)


class CriticFollowupEvalGroup(
    BaseSituEvalGroup[CriticFollowupEvalInput, CriticFollowupEvalOutput]
):
    suite_name: ClassVar[str] = "agents"
    world_name: ClassVar[str] = "critic_followup"

    def task(self, args: CriticFollowupEvalInput) -> CriticFollowupEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("seed", args.seed)
        output = run_critic_followup(args)
        increment_eval_metric("manager_tool_calls", len(output.manager_tool_calls))
        increment_eval_metric(
            "manager_created_tasks",
            output.signals.get("manager_created_tasks") or 0,
        )
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("changed_files", len(output.changed_files))
        return output

    def eval_cases(self) -> list[Case[CriticFollowupEvalInput, CriticFollowupEvalOutput]]:
        return critic_followup_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []
