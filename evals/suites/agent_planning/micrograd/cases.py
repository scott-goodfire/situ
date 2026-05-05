from __future__ import annotations

from pydantic_evals import Case

from evals.harness.evaluators import (
    ContentContains,
    EventWasEmitted,
    FindingContains,
    ToolArgsContain,
    ToolCallOrder,
    ToolWasCalled,
    WarningWasCreated,
)
from evals.harness.models import AlmanacEvalOutput
from evals.worlds.micrograd import MicrogradEvalInput


def micrograd_planning_cases() -> list[Case[MicrogradEvalInput, AlmanacEvalOutput]]:
    return [
        Case(
            name="baseline_first",
                inputs=MicrogradEvalInput(
                    case_id="baseline_first",
                    scenario="empty_run",
                    state="No baseline has been recorded yet.",
                ),
                metadata={"requires_real_llm": True},
                evaluators=(
                ContentContains("baseline"),
                ToolWasCalled("run_experiment"),
                ToolArgsContain("run_experiment", "baseline"),
                ToolCallOrder("run_experiment", "evaluate_evidence"),
                EventWasEmitted("tool_call.completed"),
            ),
        ),
        Case(
            name="breadth_before_commitment",
                inputs=MicrogradEvalInput(
                    case_id="breadth_before_commitment",
                    scenario="after_baseline",
                    state="Baseline exists. No simple variants have been tried.",
                ),
                metadata={"requires_real_llm": True},
            evaluators=(
                ContentContains("A, B, and C"),
                ToolArgsContain("run_experiment", "A"),
                ToolArgsContain("run_experiment", "B"),
                ToolArgsContain("run_experiment", "C"),
                FindingContains("A and C"),
            ),
        ),
        Case(
            name="combine_promising_components",
                inputs=MicrogradEvalInput(
                    case_id="combine_promising_components",
                    scenario="after_simple_variants",
                    state="A and C improved over baseline. B was weaker and slower.",
                ),
                metadata={"requires_real_llm": True},
            evaluators=(
                ContentContains("A+C"),
                ToolArgsContain("run_experiment", "A"),
                ToolArgsContain("run_experiment", "C"),
                FindingContains("best valid combination"),
            ),
        ),
        Case(
            name="suspicious_win_is_not_accepted",
                inputs=MicrogradEvalInput(
                    case_id="suspicious_win_is_not_accepted",
                    scenario="suspicious_win",
                    state="A bad variant reports a huge score jump but changes evidence shape.",
                ),
                metadata={"requires_real_llm": True},
            evaluators=(
                ContentContains("Do not trust"),
                ToolWasCalled("evaluate_evidence"),
                WarningWasCreated("evidence_shape_changed"),
                WarningWasCreated("missing_signal"),
                FindingContains("suspicious"),
            ),
        ),
        Case(
            name="synthesizes_findings_from_evidence",
                inputs=MicrogradEvalInput(
                    case_id="synthesizes_findings_from_evidence",
                    scenario="synthesize_findings",
                    state="Baseline, A, B, C, and A+C all have valid evidence.",
                ),
                metadata={"requires_real_llm": True},
            evaluators=(
                ContentContains("Synthesize"),
                FindingContains("C improves"),
                FindingContains("A+C"),
                FindingContains("B is less attractive"),
            ),
        ),
    ]
