from __future__ import annotations

from pathlib import Path

import pytest
from pydantic_ai import Agent, WebSearchTool
from pydantic_ai.durable_exec.dbos import DBOSAgent
from pydantic_ai_skills import SkillsToolset

from situ.harness.config import DEFAULTS, LocalSecretStore
from situ.harness.agent_runtime import MANAGER_AGENT_NAME, AgentRuntime
from situ.harness.agent_skills import (
    build_manager_skill_capabilities,
    build_researcher_skill_capabilities,
)
from situ.harness.agents.research.agent import RESEARCHER_AGENT_NAME, RESEARCH_AGENT_NAME
from situ.harness.core.dbos.runtime import reset_dbos_for_tests


def _agent_has_web_search(agent: Agent) -> bool:
    return any(
        isinstance(tool, WebSearchTool)
        for tool in getattr(agent, "_cap_builtin_tools", ())
    )


def _agent_skill_names(agent: Agent) -> set[str]:
    names: set[str] = set()
    for toolset in agent.toolsets:
        names.update(_skill_names_from_toolset(toolset))
    return names


def _skill_names_from_toolset(toolset: object) -> set[str]:
    if isinstance(toolset, SkillsToolset):
        return set(toolset.skills)
    names: set[str] = set()
    for child in getattr(toolset, "toolsets", ()):
        names.update(_skill_names_from_toolset(child))
    return names


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
    assert _agent_has_web_search(runtime.manager_agent)
    assert _agent_skill_names(runtime.manager_agent) == {
        "planning-pass",
        "source-grounding",
        "task-decomposition",
    }
    assert runtime.researcher_agent.name == RESEARCHER_AGENT_NAME
    assert runtime.researcher_agent.model_settings == runtime.agent.model_settings
    assert isinstance(runtime.dbos_researcher_agent, DBOSAgent)
    assert runtime.researcher_agent.toolsets
    assert _agent_has_web_search(runtime.researcher_agent)
    assert _agent_skill_names(runtime.researcher_agent) == {
        "codebase-map",
        "hypothesis-handoff",
        "prior-art-synthesis",
        "source-grounding",
        "web-research",
    }
    assert not _agent_has_web_search(runtime.agent)
    assert not _agent_skill_names(runtime.agent)
    assert not _agent_has_web_search(runtime.critic_agent)
    assert not _agent_skill_names(runtime.critic_agent)


def test_runtime_agent_skill_capabilities_discover_expected_skills() -> None:
    manager = build_manager_skill_capabilities()[0].toolset
    researcher = build_researcher_skill_capabilities()[0].toolset

    assert set(manager.skills) == {
        "planning-pass",
        "source-grounding",
        "task-decomposition",
    }
    assert set(researcher.skills) == {
        "codebase-map",
        "hypothesis-handoff",
        "prior-art-synthesis",
        "source-grounding",
        "web-research",
    }
    assert "resources/analysis-output-contract.md" in {
        resource.name for resource in researcher.get_skill("web-research").resources
    }
