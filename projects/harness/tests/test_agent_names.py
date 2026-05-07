from __future__ import annotations

from situ.harness.agents.research.agent import (
    CRITIC_AGENT_NAME,
    RESEARCHER_AGENT_NAME,
    RESEARCH_AGENT_NAME,
)


def test_harness_agent_names_use_kebab_case() -> None:
    assert RESEARCH_AGENT_NAME == "situ-research-agent"
    assert RESEARCHER_AGENT_NAME == "situ-researcher-agent"
    assert CRITIC_AGENT_NAME == "situ-critic-agent"
    assert "_" not in RESEARCH_AGENT_NAME
    assert "_" not in RESEARCHER_AGENT_NAME
    assert "_" not in CRITIC_AGENT_NAME
