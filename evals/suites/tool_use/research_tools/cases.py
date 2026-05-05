from __future__ import annotations

from pydantic_evals import Case

from evals.harness.evaluators import (
    EventWasEmitted,
    ToolResultContains,
    ToolWasCalled,
)
from evals.suites.tool_use.research_tools.evaluators import (
    SessionGraphContains,
    ToolSucceeded,
)
from evals.worlds.research_session import (
    ARTIFACT_ID,
    EXPERIMENT_ID,
    HYPOTHESIS_ID,
    OBJECTIVE_ID,
    SESSION_ID,
    ResearchToolEvalInput,
    ResearchToolEvalOutput,
)


def research_tool_cases() -> list[Case[ResearchToolEvalInput, ResearchToolEvalOutput]]:
    return [
        Case(
            name="get_session_reads_graph",
            inputs=ResearchToolEvalInput(
                case_id="get_session_reads_graph",
                seed="with_comments",
                prompt=(
                    "Use get_session for the current session. Then briefly state the "
                    "objective title and one current hypothesis."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_session"),
                ToolSucceeded("get_session"),
                ToolResultContains("get_session", "Improve validation score"),
                ToolResultContains("get_session", HYPOTHESIS_ID),
            ),
        ),
        Case(
            name="get_objective_reads_current_objective",
            inputs=ResearchToolEvalInput(
                case_id="get_objective_reads_current_objective",
                seed="basic",
                prompt=(
                    "Use get_objective without passing an objective_id. Then state the "
                    "objective title."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_objective"),
                ToolSucceeded("get_objective"),
                ToolResultContains("get_objective", OBJECTIVE_ID),
                ToolResultContains("get_objective", "Improve validation score"),
            ),
        ),
        Case(
            name="list_hypotheses_reads_existing_hypothesis",
            inputs=ResearchToolEvalInput(
                case_id="list_hypotheses_reads_existing_hypothesis",
                seed="with_hypothesis",
                prompt=(
                    "Use list_hypotheses for the current objective. Then state the "
                    "hypothesis id and title you found."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("list_hypotheses"),
                ToolSucceeded("list_hypotheses"),
                ToolResultContains("list_hypotheses", HYPOTHESIS_ID),
            ),
        ),
        Case(
            name="create_hypothesis_writes_new_hypothesis",
            inputs=ResearchToolEvalInput(
                case_id="create_hypothesis_writes_new_hypothesis",
                seed="basic",
                prompt=(
                    "Use create_hypothesis to add a hypothesis titled "
                    "'Cache stability improves score' with summary "
                    "'Stabilizing cache keys may improve validation score.'"
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_hypothesis"),
                ToolSucceeded("create_hypothesis"),
                ToolResultContains("create_hypothesis", "Cache stability improves score"),
                SessionGraphContains("Cache stability improves score"),
                EventWasEmitted("hypothesis.created"),
            ),
        ),
        Case(
            name="update_hypothesis_writes_status_and_summary",
            inputs=ResearchToolEvalInput(
                case_id="update_hypothesis_writes_status_and_summary",
                seed="with_hypothesis",
                prompt=(
                    f"Use update_hypothesis on {HYPOTHESIS_ID}. Set status to "
                    "'closed' and summary to 'Component A appears saturated.'"
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("update_hypothesis"),
                ToolSucceeded("update_hypothesis"),
                SessionGraphContains("Component A appears saturated"),
                SessionGraphContains("closed"),
                EventWasEmitted("hypothesis.updated"),
            ),
        ),
        Case(
            name="list_experiments_reads_existing_experiment",
            inputs=ResearchToolEvalInput(
                case_id="list_experiments_reads_existing_experiment",
                seed="with_experiment",
                prompt=(
                    "Use list_experiments for the current session. Then state the "
                    "experiment id and title you found."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("list_experiments"),
                ToolSucceeded("list_experiments"),
                ToolResultContains("list_experiments", EXPERIMENT_ID),
            ),
        ),
        Case(
            name="create_experiment_writes_new_experiment",
            inputs=ResearchToolEvalInput(
                case_id="create_experiment_writes_new_experiment",
                seed="basic",
                prompt=(
                    "Use create_experiment to add an experiment titled "
                    "'Try cache-key normalization' with summary "
                    "'Normalize cache keys and compare validation score.'"
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_experiment"),
                ToolSucceeded("create_experiment"),
                ToolResultContains("create_experiment", "Try cache-key normalization"),
                SessionGraphContains("Try cache-key normalization"),
                EventWasEmitted("experiment.created"),
            ),
        ),
        Case(
            name="update_experiment_writes_status_and_summary",
            inputs=ResearchToolEvalInput(
                case_id="update_experiment_writes_status_and_summary",
                seed="with_experiment",
                prompt=(
                    f"Use update_experiment on {EXPERIMENT_ID}. Set status to "
                    "'closed' and summary to 'Component A completed with score lift.'"
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("update_experiment"),
                ToolSucceeded("update_experiment"),
                SessionGraphContains("Component A completed with score lift"),
                SessionGraphContains("closed"),
                EventWasEmitted("experiment.updated"),
            ),
        ),
        Case(
            name="link_hypothesis_experiment_writes_join",
            inputs=ResearchToolEvalInput(
                case_id="link_hypothesis_experiment_writes_join",
                seed="with_experiment",
                prompt=(
                    f"Use link_hypothesis_experiment to link {HYPOTHESIS_ID} "
                    f"to {EXPERIMENT_ID} with note 'testing hypothesis directly'."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("link_hypothesis_experiment"),
                ToolSucceeded("link_hypothesis_experiment"),
                SessionGraphContains("testing hypothesis directly"),
                EventWasEmitted("hypothesis.experiment_linked"),
            ),
        ),
        Case(
            name="add_hypothesis_comment_writes_activity",
            inputs=ResearchToolEvalInput(
                case_id="add_hypothesis_comment_writes_activity",
                seed="with_hypothesis",
                prompt=(
                    f"Use add_hypothesis_comment on {HYPOTHESIS_ID} with comment "
                    "'Prioritize reproducing Component A before combining it.'"
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("add_hypothesis_comment"),
                ToolSucceeded("add_hypothesis_comment"),
                SessionGraphContains("Prioritize reproducing Component A"),
                EventWasEmitted("hypothesis.comment_added"),
            ),
        ),
        Case(
            name="add_experiment_comment_writes_activity",
            inputs=ResearchToolEvalInput(
                case_id="add_experiment_comment_writes_activity",
                seed="with_experiment",
                prompt=(
                    f"Use add_experiment_comment on {EXPERIMENT_ID} with comment "
                    "'Score improved but latency needs review.'"
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("add_experiment_comment"),
                ToolSucceeded("add_experiment_comment"),
                SessionGraphContains("Score improved but latency needs review"),
                EventWasEmitted("experiment.comment_added"),
            ),
        ),
        Case(
            name="list_hypothesis_activities_reads_comments",
            inputs=ResearchToolEvalInput(
                case_id="list_hypothesis_activities_reads_comments",
                seed="with_comments",
                prompt=(
                    f"Use list_hypothesis_activities for {HYPOTHESIS_ID}. Then "
                    "state the existing comment."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("list_hypothesis_activities"),
                ToolSucceeded("list_hypothesis_activities"),
                ToolResultContains("list_hypothesis_activities", "worth testing"),
            ),
        ),
        Case(
            name="list_experiment_activities_reads_comments",
            inputs=ResearchToolEvalInput(
                case_id="list_experiment_activities_reads_comments",
                seed="with_comments",
                prompt=(
                    f"Use list_experiment_activities for {EXPERIMENT_ID}. Then "
                    "state the existing comment."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("list_experiment_activities"),
                ToolSucceeded("list_experiment_activities"),
                ToolResultContains("list_experiment_activities", "score 0.73"),
            ),
        ),
        Case(
            name="create_artifact_writes_artifact",
            inputs=ResearchToolEvalInput(
                case_id="create_artifact_writes_artifact",
                seed="with_experiment",
                prompt=(
                    f"Use create_artifact for session {SESSION_ID} and experiment "
                    f"{EXPERIMENT_ID}. Use kind 'json', title 'normalized cache raw "
                    "output', path 'artifacts/normalized-cache.json', media_type "
                    "'application/json', and size_bytes 256."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_artifact"),
                ToolSucceeded("create_artifact"),
                SessionGraphContains("normalized cache raw output"),
                SessionGraphContains("artifacts/normalized-cache.json"),
                EventWasEmitted("artifact.created"),
            ),
        ),
        Case(
            name="list_artifacts_reads_existing_artifact",
            inputs=ResearchToolEvalInput(
                case_id="list_artifacts_reads_existing_artifact",
                seed="with_artifact",
                prompt=(
                    f"Use list_artifacts for experiment {EXPERIMENT_ID}. Then state "
                    "the artifact id and title you found."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("list_artifacts"),
                ToolSucceeded("list_artifacts"),
                ToolResultContains("list_artifacts", ARTIFACT_ID),
                ToolResultContains("list_artifacts", "component A raw eval output"),
            ),
        ),
    ]
