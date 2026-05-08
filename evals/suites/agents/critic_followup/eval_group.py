from __future__ import annotations

from pathlib import Path
from typing import ClassVar, Sequence

from pydantic_evals import set_eval_attribute
from pydantic_evals.dataset import increment_eval_metric
from pydantic_evals.evaluators import Evaluator

from evals.framework import BaseSituEvalGroup
from evals.suites.agents.critic_followup.evaluators import (
    FollowupTaskCarriesLineagePayload,
    FollowupTaskDoesNotUseParentExperiment,
    FollowupTaskKindIn,
    FollowupTaskMentionsAny,
    FollowupTaskStacksOnParentExperiment,
    LineageDecisionRecorded,
    ManagerCreatedFollowupTask,
    ManagerToolCalledSuccessfully,
    ManagerToolSucceeded,
    ManagerToolWasCalled,
    ProjectOverviewExperimentCountAtLeast,
    ProjectOverviewContainsReviewVerdict,
)
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
    cases_path: ClassVar[Path] = Path(__file__).parent / "cases.yaml"
    custom_evaluator_types: ClassVar[Sequence[type[Evaluator]]] = (
        FollowupTaskCarriesLineagePayload,
        FollowupTaskDoesNotUseParentExperiment,
        FollowupTaskKindIn,
        FollowupTaskMentionsAny,
        FollowupTaskStacksOnParentExperiment,
        LineageDecisionRecorded,
        ManagerCreatedFollowupTask,
        ManagerToolCalledSuccessfully,
        ManagerToolSucceeded,
        ManagerToolWasCalled,
        ProjectOverviewExperimentCountAtLeast,
        ProjectOverviewContainsReviewVerdict,
    )

    async def task(self, args: CriticFollowupEvalInput) -> CriticFollowupEvalOutput:
        set_eval_attribute("suite", self.suite_name)
        set_eval_attribute("world", self.world_name)
        set_eval_attribute("seed", args.seed)
        output = await run_critic_followup(args)
        increment_eval_metric("manager_tool_calls", len(output.manager_tool_calls))
        increment_eval_metric(
            "manager_created_tasks",
            output.signals.get("manager_created_tasks") or 0,
        )
        increment_eval_metric("events", len(output.events))
        increment_eval_metric("changed_files", len(output.changed_files))
        return output
