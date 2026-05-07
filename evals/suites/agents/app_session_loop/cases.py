from __future__ import annotations

from pydantic_evals import Case

from evals.suites.agents.app_session_loop.evaluators import (
    BaselineThenFollowupWork,
    DoneTaskKindAtLeast,
    EventWasEmitted,
    ExperimentCountAtLeast,
    NonPlanScientistTaskDone,
    PrepareFileUnchanged,
    RecordCountAtLeast,
    ProjectBoardContains,
    TaskDoneByAgentKind,
)
from evals.worlds.app_session_loop import (
    AppSessionLoopEvalInput,
    AppSessionLoopEvalOutput,
)


def app_session_loop_cases() -> list[
    Case[AppSessionLoopEvalInput, AppSessionLoopEvalOutput]
]:
    return [
        Case(
            name="continues_after_baseline_completion",
            inputs=AppSessionLoopEvalInput(
                case_id="continues_after_baseline_completion",
                seed="empty_repo",
                max_experiments=2,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                EventWasEmitted("task.done"),
                EventWasEmitted("session.manager_completed"),
                EventWasEmitted("session.agent_completed"),
                EventWasEmitted("session.completed"),
                DoneTaskKindAtLeast("plan", count=2),
                DoneTaskKindAtLeast("baseline"),
                BaselineThenFollowupWork(),
                ProjectBoardContains("baseline"),
                PrepareFileUnchanged(),
            ),
        ),
        Case(
            name="uses_existing_baseline_for_candidate_work",
            inputs=AppSessionLoopEvalInput(
                case_id="uses_existing_baseline_for_candidate_work",
                seed="with_baseline_result",
                max_experiments=1,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                EventWasEmitted("task.done"),
                EventWasEmitted("session.manager_completed"),
                EventWasEmitted("session.agent_completed"),
                EventWasEmitted("session.completed"),
                DoneTaskKindAtLeast("plan"),
                NonPlanScientistTaskDone(),
                ExperimentCountAtLeast(1),
                ProjectBoardContains("component_a"),
                ProjectBoardContains("val_bpb"),
                PrepareFileUnchanged(),
            ),
        ),
        Case(
            name="researcher_handoff_to_scientist_candidate",
            inputs=AppSessionLoopEvalInput(
                case_id="researcher_handoff_to_scientist_candidate",
                seed="with_baseline_no_hypothesis",
                max_experiments=1,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                EventWasEmitted("task.done"),
                EventWasEmitted("session.manager_completed"),
                EventWasEmitted("session.researcher_completed"),
                EventWasEmitted("session.agent_completed"),
                EventWasEmitted("session.completed"),
                DoneTaskKindAtLeast("plan", count=2),
                TaskDoneByAgentKind("research", "researcher"),
                RecordCountAtLeast("analyses"),
                RecordCountAtLeast("hypotheses"),
                TaskDoneByAgentKind("experiment", "scientist"),
                ExperimentCountAtLeast(1),
                ProjectBoardContains("component_a"),
                ProjectBoardContains("val_bpb"),
                PrepareFileUnchanged(),
            ),
        ),
    ]
