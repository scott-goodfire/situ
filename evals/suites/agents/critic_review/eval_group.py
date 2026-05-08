from __future__ import annotations

from pathlib import Path
from typing import ClassVar, Sequence

from pydantic_evals import set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.suites.agents.critic_review.evaluators import (
    CriticDidNotCreateExperimentOrMeasurement,
    CriticReviewMentionsAny,
    CriticReviewRecorded,
    CriticToolArgsContain,
    CriticToolCalledSuccessfully,
    CriticToolSucceeded,
    CriticToolWasCalled,
)
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
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        CriticDidNotCreateExperimentOrMeasurement,
        CriticReviewMentionsAny,
        CriticReviewRecorded,
        CriticToolArgsContain,
        CriticToolCalledSuccessfully,
        CriticToolSucceeded,
        CriticToolWasCalled,
    )

    async def task(self, args: CriticReviewEvalInput) -> CriticReviewEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        output = await run_critic_review(args)
        increment_eval_metric("critic_tool_calls", len(output.critic_tool_calls))
        increment_eval_metric(
            "review_activities",
            output.signals.get("review_activities") or 0,
        )
        increment_eval_metric(
            "terminal_review_records",
            output.signals.get("terminal_review_records") or 0,
        )
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("changed_files", len(output.changed_files))
        return output
