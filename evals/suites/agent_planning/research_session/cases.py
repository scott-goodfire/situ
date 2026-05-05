from __future__ import annotations

from pydantic_evals import Case

from evals.harness.evaluators import ContentContains, ToolArgsContain, ToolWasCalled
from evals.worlds.research_session import ResearchAgentEvalInput, ResearchAgentEvalOutput
from evals.worlds.research_session.world import HYPOTHESIS_ID
from evals.suites.agent_planning.research_session.evaluators import (
    SessionGraphContains,
    ToolSucceeded,
)


def research_session_planning_cases() -> list[
    Case[ResearchAgentEvalInput, ResearchAgentEvalOutput]
]:
    return [
        Case(
            name="creates_baseline_hypothesis",
            inputs=ResearchAgentEvalInput(
                case_id="creates_baseline_hypothesis",
                seed="needs_baseline",
                prompt="""
                Inspect the current session with get_session.
                Create a hypothesis titled "Baseline first" with summary
                "Record a baseline before variants." Then add a hypothesis
                comment containing the exact phrase "baseline is the first step".
                In your final summary, include "baseline is the first step".
                """,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_session"),
                ToolSucceeded("get_session"),
                ToolWasCalled("create_hypothesis"),
                ToolSucceeded("create_hypothesis"),
                ToolWasCalled("add_hypothesis_comment"),
                ToolSucceeded("add_hypothesis_comment"),
                ToolArgsContain("create_hypothesis", "Baseline first"),
                SessionGraphContains("baseline is the first step"),
                ContentContains("baseline is the first step"),
            ),
        ),
        Case(
            name="creates_followup_after_baseline",
            inputs=ResearchAgentEvalInput(
                case_id="creates_followup_after_baseline",
                seed="with_baseline_result",
                prompt=f"""
                Inspect the current session with get_session. The baseline result
                already exists. Create an experiment titled "Try component A"
                with summary "Compare component A against baseline." Link the
                new experiment to hypothesis {HYPOTHESIS_ID}. Add an experiment
                comment containing the exact phrase "compare against baseline".
                In your final next_focus or summary, mention "component A".
                """,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_session"),
                ToolSucceeded("get_session"),
                ToolWasCalled("create_experiment"),
                ToolSucceeded("create_experiment"),
                ToolWasCalled("link_hypothesis_experiment"),
                ToolSucceeded("link_hypothesis_experiment"),
                ToolWasCalled("add_experiment_comment"),
                ToolSucceeded("add_experiment_comment"),
                ToolArgsContain("create_experiment", "Try component A"),
                SessionGraphContains("compare against baseline"),
                ContentContains("component A"),
            ),
        ),
        Case(
            name="proposes_combination_from_promising_results",
            inputs=ResearchAgentEvalInput(
                case_id="proposes_combination_from_promising_results",
                seed="with_promising_results",
                prompt=f"""
                Inspect the current session with get_session. Existing results
                show components A and C are promising. Create an experiment
                titled "Try A+C" with summary "Combine the two promising
                components." Link the new experiment to hypothesis
                {HYPOTHESIS_ID}. Add a hypothesis comment containing the exact
                phrase "A and C are promising". In your final next_focus or
                summary, include "A+C".
                """,
            ),
            metadata={"requires_real_llm": True},
            evaluators=(
                ToolWasCalled("get_session"),
                ToolSucceeded("get_session"),
                ToolWasCalled("create_experiment"),
                ToolSucceeded("create_experiment"),
                ToolWasCalled("link_hypothesis_experiment"),
                ToolSucceeded("link_hypothesis_experiment"),
                ToolWasCalled("add_hypothesis_comment"),
                ToolSucceeded("add_hypothesis_comment"),
                ToolArgsContain("create_experiment", "Try A+C"),
                SessionGraphContains("A and C are promising"),
                SessionGraphContains("Try A+C"),
                ContentContains("A+C"),
            ),
        ),
    ]
