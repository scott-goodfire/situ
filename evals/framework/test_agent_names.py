from __future__ import annotations

from situ.harness.agents.research.agent import (
    RESEARCH_AGENT_NAME,
    SCIENTIST_AGENT_NAME,
)
from evals.worlds.research_session.agents.tool_agent.agent import RESEARCH_TOOL_AGENT_NAME


def test_eval_agent_names_use_kebab_case() -> None:
    assert RESEARCH_AGENT_NAME == "situ-research-agent"
    assert SCIENTIST_AGENT_NAME == "situ-scientist-agent"
    assert RESEARCH_TOOL_AGENT_NAME == "situ-research-tool-eval-agent"
    assert "_" not in RESEARCH_AGENT_NAME
    assert "_" not in SCIENTIST_AGENT_NAME
    assert "_" not in RESEARCH_TOOL_AGENT_NAME
