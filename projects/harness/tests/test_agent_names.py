from __future__ import annotations

from almanac.harness.agent_runtime import RESEARCH_PLANNER_AGENT_NAME
from almanac.harness.agents.research.agent import RESEARCH_AGENT_NAME


def test_harness_agent_names_use_kebab_case() -> None:
    assert RESEARCH_AGENT_NAME == "almanac-research-agent"
    assert RESEARCH_PLANNER_AGENT_NAME == "almanac-research-planner"
    assert "_" not in RESEARCH_AGENT_NAME
    assert "_" not in RESEARCH_PLANNER_AGENT_NAME
