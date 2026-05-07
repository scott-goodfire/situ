from __future__ import annotations

from pydantic_evals import Case

from evals.framework.evaluators import (
    ChangedFilesDoNotInclude,
    ChangedFilesExactly,
    EventWasEmitted,
    ProjectBoardContains,
)
from evals.suites.agents.app_session_loop.evaluators import (
    BaselineThenFollowupWork,
    CommandReceiptArtifactCaptured,
    DoneTaskKindAtLeast,
    ExperimentCandidateStateRecorded,
    ExperimentCountAtLeast,
    ExperimentReviewRecorded,
    ManagerCompletedAfterCriticReview,
    PatchHandoffArtifactCaptured,
    PlanningPassCountAtLeast,
    RecordCountAtLeast,
    ReviewTaskLinksComplete,
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
                PlanningPassCountAtLeast(2),
                DoneTaskKindAtLeast("baseline"),
                BaselineThenFollowupWork(),
                ProjectBoardContains("baseline"),
                ChangedFilesDoNotInclude("prepare.py"),
            ),
        ),
        Case(
            name="candidate_gets_critic_review",
            inputs=AppSessionLoopEvalInput(
                case_id="candidate_gets_critic_review",
                seed="with_baseline_result",
                max_experiments=1,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                EventWasEmitted("task.done"),
                EventWasEmitted("session.manager_completed"),
                EventWasEmitted("session.agent_completed"),
                EventWasEmitted("session.critic_completed"),
                EventWasEmitted("session.completed"),
                EventWasEmitted("artifact.command_receipt_created"),
                EventWasEmitted("experiment.worktree_completed"),
                EventWasEmitted("experiment.patch_captured"),
                TaskDoneByAgentKind("experiment", "scientist"),
                TaskDoneByAgentKind("review", "critic"),
                ExperimentCountAtLeast(1),
                ExperimentCandidateStateRecorded(),
                CommandReceiptArtifactCaptured(),
                PatchHandoffArtifactCaptured(),
                ExperimentReviewRecorded(),
                ReviewTaskLinksComplete(),
                ProjectBoardContains("critic_review"),
                ProjectBoardContains("verdict"),
                ProjectBoardContains("component_a"),
                ProjectBoardContains("val_bpb"),
                ChangedFilesExactly(),
                ChangedFilesDoNotInclude("prepare.py"),
            ),
        ),
        Case(
            name="manager_replans_after_critic_review",
            inputs=AppSessionLoopEvalInput(
                case_id="manager_replans_after_critic_review",
                seed="with_baseline_result",
                max_experiments=2,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                EventWasEmitted("session.critic_completed"),
                EventWasEmitted("session.manager_completed"),
                ManagerCompletedAfterCriticReview(),
                TaskDoneByAgentKind("review", "critic"),
                PlanningPassCountAtLeast(2),
                ProjectBoardContains("critic_review"),
                ChangedFilesDoNotInclude("prepare.py"),
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
                PlanningPassCountAtLeast(2),
                TaskDoneByAgentKind("research", "researcher"),
                RecordCountAtLeast("analyses"),
                RecordCountAtLeast("hypotheses"),
                TaskDoneByAgentKind("experiment", "scientist"),
                ExperimentCountAtLeast(1),
                ProjectBoardContains("component_a"),
                ProjectBoardContains("val_bpb"),
                ChangedFilesDoNotInclude("prepare.py"),
            ),
        ),
    ]
