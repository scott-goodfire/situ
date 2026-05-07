from __future__ import annotations

from pathlib import Path

import pytest
from pydantic_ai.durable_exec.dbos import DBOSAgent

from situ.harness.config import DEFAULTS, LocalSecretStore
from situ.harness.agent_runtime import MANAGER_AGENT_NAME, AgentRuntime
from situ.harness.agents.research.agent import RESEARCHER_AGENT_NAME, RESEARCH_AGENT_NAME
from situ.harness.core.dbos.runtime import reset_dbos_for_tests


@pytest.fixture(autouse=True)
def _reset_dbos() -> None:
    reset_dbos_for_tests()
    yield
    reset_dbos_for_tests()


def test_agent_runtime_wraps_research_agent_with_dbos_agent(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    project_dir.mkdir(parents=True)
    LocalSecretStore(home=tmp_path / ".situ").set_openai_key("test-openai-key")

    runtime = AgentRuntime(project_dir)

    assert runtime.model_name == DEFAULTS.agent_model
    assert runtime.agent.name == RESEARCH_AGENT_NAME
    assert runtime.agent.model_settings == {
        "thinking": "low",
        "openai_reasoning_effort": "low",
    }
    assert isinstance(runtime.dbos_agent, DBOSAgent)
    assert runtime.agent.toolsets
    assert runtime.manager_agent.name == MANAGER_AGENT_NAME
    assert runtime.manager_agent.model_settings == runtime.agent.model_settings
    assert isinstance(runtime.dbos_manager_agent, DBOSAgent)
    assert runtime.manager_agent.toolsets
    assert runtime.researcher_agent.name == RESEARCHER_AGENT_NAME
    assert runtime.researcher_agent.model_settings == runtime.agent.model_settings
    assert isinstance(runtime.dbos_researcher_agent, DBOSAgent)
    assert runtime.researcher_agent.toolsets
