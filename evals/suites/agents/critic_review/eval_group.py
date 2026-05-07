from __future__ import annotations

from typing import Any, ClassVar, Sequence

from pydantic_evals import Case, set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.suites.agents.critic_review.cases import critic_review_cases
from evals.worlds.critic_review import (
    CriticReviewEvalInput,
    CriticReviewEvalOutput,
    run_critic_review,
)


class CriticReviewEvalGroup(
    BaseSituEvalGroup[CriticReviewEvalInput, CriticReviewEvalOutput]
):
    suite_name: ClassVar[str] = "agents"
    world_name: ClassVar[str] = "critic_review"

    def task(self, args: CriticReviewEvalInput) -> CriticReviewEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("case_id", args.case_id)
        set_eval_attribute("seed", args.seed)
        output = run_critic_review(args)
        increment_eval_metric("critic_tool_calls", len(output.critic_tool_calls))
        increment_eval_metric(
            "review_activities",
            output.signals.get("review_activities") or 0,
        )
        increment_eval_metric(
            "done_review_tasks",
            output.signals.get("done_review_tasks") or 0,
        )
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("changed_files", len(output.changed_files))
        return output

    def eval_cases(self) -> list[Case[CriticReviewEvalInput, CriticReviewEvalOutput]]:
        return critic_review_cases()

    def dataset_evaluators(self) -> Sequence[Evaluator[Any, Any, Any]]:
        return []
