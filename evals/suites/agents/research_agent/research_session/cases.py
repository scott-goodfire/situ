from __future__ import annotations

from pydantic_evals import Case

from evals.framework.evaluators import (
    ContentContains,
    ProjectBoardContains,
    ToolArgsContain,
    ToolSucceeded,
    ToolWasCalled,
)
from evals.worlds.research_session import ResearchAgentEvalInput, ResearchAgentEvalOutput
from evals.worlds.research_session.world import HYPOTHESIS_ID


def research_session_planning_cases() -> list[
    Case[ResearchAgentEvalInput, ResearchAgentEvalOutput]
]:
    return [
        Case(
            name="creates_baseline_measurement_thread",
            inputs=ResearchAgentEvalInput(
                case_id="creates_baseline_measurement_thread",
                seed="needs_baseline",
                prompt="""
                Take a look at the current project first. We do not have a
                baseline yet, so create a baseline titled "Baseline first"
                with the summary "Reference condition before variants." Then
                create an evaluation associated with that baseline titled
                "Baseline measurement plan" with the summary "Record a
                baseline before variants." Mention "baseline is the first
                step" in your summary.
                """,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_project_board"),
                ToolSucceeded("get_project_board"),
                ToolWasCalled("create_baseline"),
                ToolSucceeded("create_baseline"),
                ToolWasCalled("create_evaluation"),
                ToolSucceeded("create_evaluation"),
                ToolArgsContain("create_baseline", "Baseline first"),
                ToolArgsContain("create_evaluation", "Baseline measurement plan"),
                ProjectBoardContains("Baseline measurement plan"),
                ContentContains("baseline is the first step"),
            ),
        ),
        Case(
            name="creates_followup_after_baseline",
            inputs=ResearchAgentEvalInput(
                case_id="creates_followup_after_baseline",
                seed="with_baseline_result",
                prompt=f"""
                Please review the current project. The baseline result is
                already recorded, so set up the next experiment as "Try
                component A" with the summary "Compare component A against
                baseline." Connect it to hypothesis {HYPOTHESIS_ID}, leave an
                experiment comment that says "compare against baseline", and
                make component A the clear next focus in your response.
                """,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_project_board"),
                ToolSucceeded("get_project_board"),
                ToolWasCalled("create_experiment"),
                ToolSucceeded("create_experiment"),
                ToolWasCalled("link_hypothesis_experiment"),
                ToolSucceeded("link_hypothesis_experiment"),
                ToolWasCalled("add_experiment_comment"),
                ToolSucceeded("add_experiment_comment"),
                ToolArgsContain("create_experiment", "Try component A"),
                ProjectBoardContains("compare against baseline"),
                ContentContains("component A"),
            ),
        ),
        Case(
            name="proposes_combination_from_promising_results",
            inputs=ResearchAgentEvalInput(
                case_id="proposes_combination_from_promising_results",
                seed="with_promising_results",
                prompt=f"""
                Look over the project board. The recent results make A and C look
                promising, so propose the combined follow-up as an experiment
                titled "Try A+C" with the summary "Combine the two promising
                components." Link it to hypothesis {HYPOTHESIS_ID}. Also leave
                a hypothesis comment that says "A and C are promising", and
                make sure your response names A+C as the next move.
                """,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_project_board"),
                ToolSucceeded("get_project_board"),
                ToolWasCalled("create_experiment"),
                ToolSucceeded("create_experiment"),
                ToolWasCalled("link_hypothesis_experiment"),
                ToolSucceeded("link_hypothesis_experiment"),
                ToolWasCalled("add_hypothesis_comment"),
                ToolSucceeded("add_hypothesis_comment"),
                ToolArgsContain("create_experiment", "Try A+C"),
                ProjectBoardContains("A and C are promising"),
                ProjectBoardContains("Try A+C"),
                ContentContains("A+C"),
            ),
        ),
    ]
