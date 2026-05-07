from __future__ import annotations

from pydantic_evals import Case

from evals.suites.agents.critic_followup.evaluators import (
    FollowupTaskKindIn,
    FollowupTaskMentionsAny,
    ManagerCreatedFollowupTask,
    ManagerToolSucceeded,
    ManagerToolWasCalled,
    ProjectBoardContainsReviewVerdict,
)
from evals.worlds.critic_followup import (
    CriticFollowupEvalInput,
    CriticFollowupEvalOutput,
)


def critic_followup_cases() -> list[
    Case[CriticFollowupEvalInput, CriticFollowupEvalOutput]
]:
    return [
        Case(
            name="needs_reproduction_creates_reproduction_task",
            inputs=CriticFollowupEvalInput(
                case_id="needs_reproduction_creates_reproduction_task",
                seed="needs_reproduction",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ManagerToolWasCalled("get_task"),
                ManagerToolWasCalled("get_project_board"),
                ManagerToolWasCalled("create_task"),
                ManagerToolSucceeded("create_task"),
                ProjectBoardContainsReviewVerdict("needs_reproduction"),
                ManagerCreatedFollowupTask(),
                FollowupTaskKindIn("experiment"),
                FollowupTaskMentionsAny("reproduce", "repeat", "replicate"),
            ),
        ),
        Case(
            name="invalid_review_creates_revise_or_discard_task",
            inputs=CriticFollowupEvalInput(
                case_id="invalid_review_creates_revise_or_discard_task",
                seed="invalid",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ManagerToolWasCalled("get_task"),
                ManagerToolWasCalled("get_project_board"),
                ManagerToolWasCalled("create_task"),
                ManagerToolSucceeded("create_task"),
                ProjectBoardContainsReviewVerdict("invalid"),
                ManagerCreatedFollowupTask(),
                FollowupTaskKindIn("research", "interpret", "experiment"),
                FollowupTaskMentionsAny(
                    "invalid",
                    "discard",
                    "revise",
                    "comparability",
                    "prepare.py",
                ),
            ),
        ),
        Case(
            name="human_review_escalates_without_new_candidate",
            inputs=CriticFollowupEvalInput(
                case_id="human_review_escalates_without_new_candidate",
                seed="human_review",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ManagerToolWasCalled("get_task"),
                ManagerToolWasCalled("get_project_board"),
                ManagerToolWasCalled("create_task"),
                ManagerToolSucceeded("create_task"),
                ProjectBoardContainsReviewVerdict("human_review"),
                ManagerCreatedFollowupTask(),
                FollowupTaskKindIn("research", "interpret"),
                FollowupTaskMentionsAny("human", "review", "blocker", "decision"),
            ),
        ),
        Case(
            name="usable_review_does_not_overblock",
            inputs=CriticFollowupEvalInput(
                case_id="usable_review_does_not_overblock",
                seed="usable",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ManagerToolWasCalled("get_task"),
                ManagerToolWasCalled("get_project_board"),
                ManagerToolWasCalled("create_task"),
                ManagerToolSucceeded("create_task"),
                ProjectBoardContainsReviewVerdict("usable"),
                ManagerCreatedFollowupTask(),
                FollowupTaskKindIn("research", "hypothesize", "experiment"),
                FollowupTaskMentionsAny("build", "combine", "next", "component"),
            ),
        ),
    ]
