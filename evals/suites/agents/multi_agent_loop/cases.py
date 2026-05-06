from __future__ import annotations

from pydantic_evals import Case

from evals.harness.evaluators import (
    EventWasEmitted,
    ToolArgsContain,
    ToolResultContains,
    ToolWasCalled,
)
from evals.suites.agents.multi_agent_loop.evaluators import (
    BaselineEvaluationRecorded,
    FollowupTaskCreatedAfterBaseline,
    RoleToolSucceeded,
    RoleToolWasCalled,
    SessionGraphContains,
    ScientistCompletedBaselineTask,
)
from evals.worlds.multi_agent_loop import (
    MultiAgentLoopEvalInput,
    MultiAgentLoopEvalOutput,
)


def multi_agent_loop_cases() -> list[
    Case[MultiAgentLoopEvalInput, MultiAgentLoopEvalOutput]
]:
    return [
        Case(
            name="baseline_loop_from_empty_project",
            inputs=MultiAgentLoopEvalInput(
                case_id="baseline_loop_from_empty_project",
                seed="empty_repo",
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                RoleToolWasCalled("manager", "get_session"),
                RoleToolWasCalled("manager", "create_task"),
                RoleToolSucceeded("manager", "create_task"),
                RoleToolWasCalled("scientist", "get_session"),
                RoleToolWasCalled("scientist", "claim_task"),
                RoleToolSucceeded("scientist", "claim_task"),
                RoleToolWasCalled("scientist", "inspect_workspace_state"),
                RoleToolWasCalled("scientist", "execute"),
                ToolArgsContain("execute", "train.py"),
                ToolResultContains("execute", "val_bpb"),
                RoleToolWasCalled("scientist", "create_evaluation"),
                RoleToolSucceeded("scientist", "create_evaluation"),
                RoleToolWasCalled("scientist", "add_evaluation_result"),
                RoleToolSucceeded("scientist", "add_evaluation_result"),
                RoleToolWasCalled("scientist", "update_task"),
                RoleToolSucceeded("scientist", "update_task"),
                ToolWasCalled("create_task"),
                EventWasEmitted("task.claimed"),
                EventWasEmitted("task.done"),
                EventWasEmitted("evaluation.created"),
                EventWasEmitted("evaluation.result_added"),
                SessionGraphContains("val_bpb"),
                SessionGraphContains("baseline"),
                ScientistCompletedBaselineTask(),
                BaselineEvaluationRecorded(),
                FollowupTaskCreatedAfterBaseline(),
            ),
        )
    ]
