from __future__ import annotations

from pydantic_evals import Case

from evals.harness.evaluators import (
    EventWasEmitted,
    ToolArgsContain,
    ToolResultContains,
    ToolWasCalled,
)
from evals.suites.tools.research_tools.evaluators import (
    SessionGraphContains,
    SessionGraphHasLink,
    ToolSucceeded,
)
from evals.worlds.research_session import (
    ARTIFACT_ID,
    EXPERIMENT_ID,
    HYPOTHESIS_ID,
    PROJECT_ID,
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
                    "Please check the current session with get_session, then briefly "
                    "state the objective title and one hypothesis on the board."
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
            name="get_project_reads_current_project",
            inputs=ResearchToolEvalInput(
                case_id="get_project_reads_current_project",
                seed="basic",
                prompt=(
                    "Please load the current project with get_project and state "
                    "the title and objective."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_project"),
                ToolSucceeded("get_project"),
                ToolResultContains("get_project", PROJECT_ID),
                ToolResultContains("get_project", "Improve validation score"),
            ),
        ),
        Case(
            name="project_setup_and_update_flow",
            inputs=ResearchToolEvalInput(
                case_id="project_setup_and_update_flow",
                seed="projectless",
                prompt=(
                    "This session has no project yet. Create a project with "
                    "create_project using title 'Repo quality lift', objective "
                    "'Improve retrieval quality', and research_context "
                    "'Use score and latency_ms.' Then update that project with "
                    "update_project so the research_context becomes "
                    "'Refined research context: compare score and latency_ms.' "
                    "Finally call get_project and state the project title."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_project"),
                ToolSucceeded("create_project"),
                ToolWasCalled("update_project"),
                ToolSucceeded("update_project"),
                ToolWasCalled("get_project"),
                ToolSucceeded("get_project"),
                ToolResultContains("get_project", "Repo quality lift"),
                SessionGraphContains("Refined research context"),
                EventWasEmitted("project.created"),
                EventWasEmitted("project.updated"),
            ),
        ),
        Case(
            name="list_hypotheses_reads_existing_hypothesis",
            inputs=ResearchToolEvalInput(
                case_id="list_hypotheses_reads_existing_hypothesis",
                seed="with_hypothesis",
                prompt=(
                    "Please pull the current project's hypotheses with "
                    "list_hypotheses, then state the id and title you found."
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
            name="analysis_creation_comment_and_readback",
            inputs=ResearchToolEvalInput(
                case_id="analysis_creation_comment_and_readback",
                seed="basic",
                prompt=(
                    "Create an analysis with create_analysis titled 'Codebase "
                    "map for evals', summary 'Mapped the current eval knobs.', "
                    "and content 'The main knobs are score, latency_ms, and "
                    "tests_passed.' Add an analysis comment that says "
                    "'Use this map before forming hypotheses.' Then call "
                    "list_analyses and list_analysis_activities to read both "
                    "records back."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_analysis"),
                ToolSucceeded("create_analysis"),
                ToolWasCalled("add_analysis_comment"),
                ToolSucceeded("add_analysis_comment"),
                ToolWasCalled("list_analyses"),
                ToolSucceeded("list_analyses"),
                ToolWasCalled("list_analysis_activities"),
                ToolSucceeded("list_analysis_activities"),
                ToolResultContains("list_analyses", "Codebase map for evals"),
                ToolResultContains(
                    "list_analysis_activities",
                    "Use this map before forming hypotheses",
                ),
                SessionGraphContains("Mapped the current eval knobs"),
                EventWasEmitted("analysis.created"),
                EventWasEmitted("analysis.comment_added"),
            ),
        ),
        Case(
            name="create_hypothesis_writes_new_hypothesis",
            inputs=ResearchToolEvalInput(
                case_id="create_hypothesis_writes_new_hypothesis",
                seed="basic",
                prompt=(
                    "Please add a hypothesis with create_hypothesis. Title it "
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
                    f"Please update hypothesis {HYPOTHESIS_ID} with "
                    "update_hypothesis. Set status to 'closed' and summary to "
                    "'Component A appears saturated.'"
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
            name="task_board_coordination_flow",
            inputs=ResearchToolEvalInput(
                case_id="task_board_coordination_flow",
                seed="with_hypothesis",
                prompt=(
                    "Coordinate work with tasks. First create a baseline task "
                    "with create_task: title 'Establish baseline eval', content "
                    "'Run baseline and record evidence.', kind 'baseline', "
                    "priority 'high'. Then create a dependent hypothesize task "
                    "with title 'Generate follow-up hypotheses', content "
                    "'Generate hypotheses after baseline evidence exists.', "
                    "kind 'hypothesize', priority 'normal', blocked by the "
                    "baseline task id. Call get_task_board. Claim the baseline "
                    "task with claim_task, mark that claimed task done with "
                    "update_task and result_summary 'Baseline evidence ready.', "
                    "then claim the next task. Add a task comment to the "
                    "second claimed task saying 'claimed after baseline'. Link "
                    f"that second task to hypothesis {HYPOTHESIS_ID} with "
                    "link_task_entity using entity_kind 'hypothesis' and "
                    "relationship 'referenced'."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_task"),
                ToolSucceeded("create_task"),
                ToolWasCalled("get_task_board"),
                ToolSucceeded("get_task_board"),
                ToolWasCalled("claim_task"),
                ToolSucceeded("claim_task"),
                ToolWasCalled("update_task"),
                ToolSucceeded("update_task"),
                ToolWasCalled("add_task_comment"),
                ToolSucceeded("add_task_comment"),
                ToolWasCalled("link_task_entity"),
                ToolSucceeded("link_task_entity"),
                SessionGraphContains("Establish baseline eval"),
                SessionGraphContains("Generate follow-up hypotheses"),
                SessionGraphContains("claimed after baseline"),
                SessionGraphContains(HYPOTHESIS_ID),
                EventWasEmitted("task.created"),
                EventWasEmitted("task.done"),
                EventWasEmitted("task.comment_added"),
                EventWasEmitted("task.entity_linked"),
            ),
        ),
        Case(
            name="list_experiments_reads_existing_experiment",
            inputs=ResearchToolEvalInput(
                case_id="list_experiments_reads_existing_experiment",
                seed="with_experiment",
                prompt=(
                    "Please review the current session's experiments with "
                    "list_experiments, then state the experiment id and title you "
                    "found."
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
            name="evaluation_result_kind_is_result",
            inputs=ResearchToolEvalInput(
                case_id="evaluation_result_kind_is_result",
                seed="basic",
                prompt=(
                    "Create a baseline with create_baseline titled "
                    "'Current baseline' and summary 'Reference behavior.' "
                    "Create an evaluation associated with that baseline using "
                    "create_evaluation titled "
                    "'Baseline command output' and summary 'Record baseline "
                    "score output.' Add an evaluation result with "
                    "add_evaluation_result using result 'score=0.730 latency=120'. "
                    "Then call list_evaluation_activities for that evaluation "
                    "and report the activity kind."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("create_baseline"),
                ToolSucceeded("create_baseline"),
                ToolWasCalled("create_evaluation"),
                ToolSucceeded("create_evaluation"),
                ToolWasCalled("add_evaluation_result"),
                ToolSucceeded("add_evaluation_result"),
                ToolWasCalled("list_evaluation_activities"),
                ToolSucceeded("list_evaluation_activities"),
                ToolResultContains("list_evaluation_activities", '"kind": "result"'),
                SessionGraphContains("score=0.730"),
                EventWasEmitted("evaluation.created"),
                EventWasEmitted("evaluation.result_added"),
            ),
        ),
        Case(
            name="create_experiment_writes_new_experiment",
            inputs=ResearchToolEvalInput(
                case_id="create_experiment_writes_new_experiment",
                seed="basic",
                prompt=(
                    "Please add an experiment with create_experiment. Title it "
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
            name="workspace_state_inspection_reports_dirty_eval_surface",
            inputs=ResearchToolEvalInput(
                case_id="workspace_state_inspection_reports_dirty_eval_surface",
                seed="with_dirty_workspace",
                prompt=(
                    "Inspect the workspace state with inspect_workspace_state "
                    "using eval_command 'python train.py'. State whether the "
                    "workspace is dirty and name any changed-file categories."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("inspect_workspace_state"),
                ToolSucceeded("inspect_workspace_state"),
                ToolArgsContain("inspect_workspace_state", "python train.py"),
                ToolResultContains("inspect_workspace_state", '"dirty": true'),
                ToolResultContains("inspect_workspace_state", "test_or_eval"),
                ToolResultContains("inspect_workspace_state", "dependency"),
                ToolResultContains(
                    "inspect_workspace_state",
                    "Workspace has uncommitted changes",
                ),
            ),
        ),
        Case(
            name="update_experiment_writes_status_and_summary",
            inputs=ResearchToolEvalInput(
                case_id="update_experiment_writes_status_and_summary",
                seed="with_experiment",
                prompt=(
                    f"Please update experiment {EXPERIMENT_ID} with "
                    "update_experiment. Set status to 'closed' and summary to "
                    "'Component A completed with score lift.'"
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
                    f"Please connect hypothesis {HYPOTHESIS_ID} to experiment "
                    f"{EXPERIMENT_ID} with link_hypothesis_experiment."
                ),
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("link_hypothesis_experiment"),
                ToolSucceeded("link_hypothesis_experiment"),
                SessionGraphHasLink(HYPOTHESIS_ID, EXPERIMENT_ID),
                EventWasEmitted("hypothesis.experiment_linked"),
            ),
        ),
        Case(
            name="add_hypothesis_comment_writes_activity",
            inputs=ResearchToolEvalInput(
                case_id="add_hypothesis_comment_writes_activity",
                seed="with_hypothesis",
                prompt=(
                    f"Please leave a hypothesis comment on {HYPOTHESIS_ID} with "
                    "add_hypothesis_comment: 'Prioritize reproducing Component A "
                    "before combining it.'"
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
                    f"Please leave an experiment comment on {EXPERIMENT_ID} with "
                    "add_experiment_comment: 'Score improved but latency needs "
                    "review.'"
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
                    f"Please read the activity for hypothesis {HYPOTHESIS_ID} with "
                    "list_hypothesis_activities, then state the existing comment."
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
                    f"Please read the activity for experiment {EXPERIMENT_ID} with "
                    "list_experiment_activities, then state the existing comment."
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
                    f"Please record a JSON artifact with create_artifact for "
                    f"session {SESSION_ID} and experiment {EXPERIMENT_ID}. Use "
                    "title 'normalized cache raw output', path "
                    "'artifacts/normalized-cache.json', media_type "
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
                    f"Please look up artifacts for experiment {EXPERIMENT_ID} with "
                    "list_artifacts, then state the artifact id and title you found."
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
