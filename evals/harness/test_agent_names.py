from __future__ import annotations

from evals.worlds.micrograd.agents.planning_agent.agent import MICROGRAD_AGENT_NAME
from evals.worlds.research_session.agents.tool_agent.agent import RESEARCH_TOOL_AGENT_NAME


def test_eval_agent_names_use_kebab_case() -> None:
    assert RESEARCH_TOOL_AGENT_NAME == "almanac-research-tool-eval-agent"
    assert MICROGRAD_AGENT_NAME == "almanac-micrograd-eval-agent"
    assert "_" not in RESEARCH_TOOL_AGENT_NAME
    assert "_" not in MICROGRAD_AGENT_NAME
