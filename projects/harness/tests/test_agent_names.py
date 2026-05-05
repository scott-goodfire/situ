from __future__ import annotations

from almanac.harness.agents.research.agent import RESEARCH_AGENT_NAME


def test_harness_agent_names_use_kebab_case() -> None:
    assert RESEARCH_AGENT_NAME == "almanac-research-agent"
    assert "_" not in RESEARCH_AGENT_NAME
