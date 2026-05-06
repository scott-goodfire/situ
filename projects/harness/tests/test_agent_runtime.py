from __future__ import annotations

from pathlib import Path

import pytest
from pydantic_ai.durable_exec.dbos import DBOSAgent

from situ.harness.agent_runtime import MANAGER_AGENT_NAME, AgentRuntime
from situ.harness.agents.research.agent import RESEARCH_AGENT_NAME


def test_agent_runtime_wraps_research_agent_with_dbos_agent(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SITU_OPENAI_KEY", "test-openai-key")

    runtime = AgentRuntime(tmp_path)

    assert runtime.agent.name == RESEARCH_AGENT_NAME
    assert isinstance(runtime.dbos_agent, DBOSAgent)
    assert runtime.agent.toolsets
    assert runtime.manager_agent.name == MANAGER_AGENT_NAME
    assert isinstance(runtime.dbos_manager_agent, DBOSAgent)
    assert runtime.manager_agent.toolsets
