from __future__ import annotations

from almanac.harness.agents.research.agent import (
    RESEARCH_AGENT_NAME,
)
from evals.worlds.research_session.agents.tool_agent.agent import RESEARCH_TOOL_AGENT_NAME


def test_eval_agent_names_use_kebab_case() -> None:
    assert RESEARCH_AGENT_NAME == "almanac-research-agent"
    assert RESEARCH_TOOL_AGENT_NAME == "almanac-research-tool-eval-agent"
    assert "_" not in RESEARCH_AGENT_NAME
    assert "_" not in RESEARCH_TOOL_AGENT_NAME
