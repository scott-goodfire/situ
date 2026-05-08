"""Tests for the agent voice contract (spec 0020-agent-voice).

The contract has two pieces: the shared drafting rules in
`agents/_shared/instructions.py`, and per-tool examples in each
voice-bearing tool's docstring. These tests guard both.
"""
from __future__ import annotations

import pytest

from situ.harness.agents._shared import DRAFTING_RULES, with_drafting_rules
from situ.harness.agents.research.prompt import (
    CRITIC_AGENT_INSTRUCTIONS,
    MANAGER_AGENT_INSTRUCTIONS,
    RESEARCH_AGENT_INSTRUCTIONS,
    RESEARCHER_AGENT_INSTRUCTIONS,
)


def test_drafting_rules_shape() -> None:
    assert DRAFTING_RULES.startswith("<drafting_rules>")
    assert DRAFTING_RULES.endswith("</drafting_rules>")
    # The rule list has at least 5 bullets; growth is allowed.
    assert DRAFTING_RULES.count("\n- ") >= 5
    # The "complete sentences" rule is load-bearing — hard-assert it stays
    # in so the regression that triggers fragment output can't sneak back.
    assert "complete sentences" in DRAFTING_RULES.lower()
    assert "first-person" in DRAFTING_RULES.lower()
    assert "markdown" in DRAFTING_RULES.lower()


def test_with_drafting_rules_prepends_rules_to_core() -> None:
    out = with_drafting_rules("CORE_TEXT_HERE")
    assert out.startswith("<drafting_rules>")
    assert "CORE_TEXT_HERE" in out
    assert out.endswith("CORE_TEXT_HERE")


def test_with_drafting_rules_is_byte_stable() -> None:
    a = with_drafting_rules("hello")
    b = with_drafting_rules("hello")
    assert a == b


@pytest.mark.parametrize(
    "name,instructions",
    [
        ("Scientist", RESEARCH_AGENT_INSTRUCTIONS),
        ("Researcher", RESEARCHER_AGENT_INSTRUCTIONS),
        ("Manager", MANAGER_AGENT_INSTRUCTIONS),
        ("Critic", CRITIC_AGENT_INSTRUCTIONS),
    ],
)
def test_each_agent_starts_with_drafting_rules(
    name: str, instructions: str
) -> None:
    assert instructions.startswith("<drafting_rules>"), (
        f"{name} instructions should lead with the drafting rules block"
    )


@pytest.mark.parametrize(
    "name,instructions",
    [
        ("Scientist", RESEARCH_AGENT_INSTRUCTIONS),
        ("Researcher", RESEARCHER_AGENT_INSTRUCTIONS),
        ("Manager", MANAGER_AGENT_INSTRUCTIONS),
        ("Critic", CRITIC_AGENT_INSTRUCTIONS),
    ],
)
def test_no_agent_core_carries_a_duplicate_style_section(
    name: str, instructions: str
) -> None:
    """Per spec 0020-agent-voice the voice contract is centralized in the
    drafting rules. Agent core text must not carry its own `Style:`
    section — that text would either duplicate the rules or contradict
    them."""
    core = instructions.split("</drafting_rules>", 1)[-1]
    assert "\nStyle:\n" not in core, (
        f"{name} core re-introduced a Style: section; voice belongs in "
        "agents/_shared/instructions.py, not in agent core text."
    )


def test_voice_bearing_tools_have_at_least_three_examples() -> None:
    """Each tool that produces voice-bearing prose carries 3-5 hand-tuned
    examples in its docstring. The model sees them at tool-selection time."""
    from situ.harness.tools.analyses.create_analysis.tool import CreateAnalysisTool
    from situ.harness.tools.analysis_activities.add_analysis_comment.tool import (
        AddAnalysisCommentTool,
    )
    from situ.harness.tools.baseline_activities.add_baseline_comment.tool import (
        AddBaselineCommentTool,
    )
    from situ.harness.tools.experiment_activities.add_experiment_comment.tool import (
        AddExperimentCommentTool,
    )
    from situ.harness.tools.hypotheses.create_hypothesis.tool import (
        CreateHypothesisTool,
    )
    from situ.harness.tools.hypothesis_activities.add_hypothesis_comment.tool import (
        AddHypothesisCommentTool,
    )
    from situ.harness.tools.measurements.add_measurement.tool import AddMeasurementTool
    from situ.harness.tools.task_activities.add_task_comment.tool import (
        AddTaskCommentTool,
    )
    from situ.harness.tools.tasks.complete_task.tool import CompleteTaskTool
    from situ.harness.tools.tasks.create_task.tool import CreateTaskTool

    voice_bearing = [
        CreateAnalysisTool,
        CreateHypothesisTool,
        AddAnalysisCommentTool,
        AddHypothesisCommentTool,
        AddBaselineCommentTool,
        AddExperimentCommentTool,
        AddTaskCommentTool,
        AddMeasurementTool,
        CreateTaskTool,
        CompleteTaskTool,
    ]
    for tool_cls in voice_bearing:
        doc = tool_cls.execute.__doc__ or ""
        # Count <example> opening tags. CreateHypothesisTool has paired
        # title+summary examples so it carries more — that's fine, the
        # invariant is at least 3.
        count = doc.count("<example")
        assert count >= 3, (
            f"{tool_cls.__name__} has {count} <example> blocks; spec "
            "0020-agent-voice requires 3-5 per voice-bearing tool."
        )
