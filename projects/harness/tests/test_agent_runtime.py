from __future__ import annotations

from pathlib import Path

import pytest
from pydantic_ai import Agent, WebSearchTool
from pydantic_ai.durable_exec.dbos import DBOSAgent
from pydantic_ai.messages import (
    CompactionPart,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)
from pydantic_ai_skills import SkillsToolset

from situ.harness.config import DEFAULTS, LocalSecretStore
from situ.harness.agent_runtime import MANAGER_AGENT_NAME, AgentRuntime
from situ.harness.agents.common import keep_last_compaction_history
from situ.harness.agent_skills import (
    build_critic_skill_capabilities,
    build_manager_skill_capabilities,
    build_researcher_skill_capabilities,
    build_scientist_skill_capabilities,
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


def _capability_type_names(agent: Agent) -> set[str]:
    return {
        type(capability).__name__
        for capability in getattr(agent.root_capability, "capabilities", ())
    }


def _skill_names_from_toolset(toolset: object) -> set[str]:
    if isinstance(toolset, SkillsToolset):
        return set(toolset.skills)
    names: set[str] = set()
    for child in getattr(toolset, "toolsets", ()):
        names.update(_skill_names_from_toolset(child))
    return names


MANAGER_SKILLS = {
    "planning-pass",
    "source-grounding",
    "task-decomposition",
    "task-execution",
}
RESEARCHER_SKILLS = {
    "codebase-map",
    "hypothesize-task",
    "hypothesis-handoff",
    "interpret-task",
    "prior-art-synthesis",
    "research-task",
    "source-grounding",
    "task-execution",
    "web-research",
}
SCIENTIST_SKILLS = {
    "baseline-task",
    "experiment-task",
    "interpret-task",
    "source-grounding",
    "task-execution",
}
CRITIC_SKILLS = {
    "review-task",
    "review-experiment",
    "review-hypothesis",
    "source-grounding",
    "task-execution",
}


@pytest.fixture(autouse=True)
def _reset_dbos() -> None:
    reset_dbos_for_tests()
    yield
    reset_dbos_for_tests()


@pytest.mark.asyncio
async def test_agent_runtime_wraps_research_agent_with_dbos_agent(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    project_dir.mkdir(parents=True)
    await LocalSecretStore(home=tmp_path / ".situ").set_anthropic_key(
        "test-anthropic-key"
    )

    runtime = await AgentRuntime.create(project_dir)

    assert runtime.model_name == DEFAULTS.agent_model
    assert runtime.agent.name == RESEARCH_AGENT_NAME
    assert runtime.agent.model_settings == {
        "thinking": "low",
        "timeout": DEFAULTS.agent_model_request_timeout_seconds,
    }
    assert "AnthropicCompaction" in _capability_type_names(runtime.agent)
    assert "ProcessHistory" in _capability_type_names(runtime.agent)
    assert isinstance(runtime.dbos_agent, DBOSAgent)
    assert runtime.agent.toolsets
    assert not _agent_has_web_search(runtime.agent)
    assert _agent_skill_names(runtime.agent) == SCIENTIST_SKILLS
    assert runtime.manager_agent.name == MANAGER_AGENT_NAME
    assert runtime.manager_agent.model_settings == runtime.agent.model_settings
    assert isinstance(runtime.dbos_manager_agent, DBOSAgent)
    assert runtime.manager_agent.toolsets
    assert _agent_has_web_search(runtime.manager_agent)
    assert _agent_skill_names(runtime.manager_agent) == MANAGER_SKILLS
    assert runtime.researcher_agent.name == RESEARCHER_AGENT_NAME
    assert runtime.researcher_agent.model_settings == runtime.agent.model_settings
    assert isinstance(runtime.dbos_researcher_agent, DBOSAgent)
    assert runtime.researcher_agent.toolsets
    assert _agent_has_web_search(runtime.researcher_agent)
    assert _agent_skill_names(runtime.researcher_agent) == RESEARCHER_SKILLS
    assert not _agent_has_web_search(runtime.critic_agent)
    assert _agent_skill_names(runtime.critic_agent) == CRITIC_SKILLS


@pytest.mark.asyncio
async def test_agent_runtime_wraps_agent_calls_with_dbos_workflow_timeout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: list[float] = []

    class FakeWorkflowTimeout:
        def __init__(self, timeout: float) -> None:
            seen.append(timeout)

        def __enter__(self) -> None:
            return None

        def __exit__(self, *_args: object) -> bool:
            return False

    async def fake_run(prompt: str, *, value: str) -> str:
        return f"{prompt}:{value}"

    monkeypatch.setattr(
        "situ.harness.agent_runtime.SetWorkflowTimeout",
        FakeWorkflowTimeout,
    )

    result = await AgentRuntime._run_with_workflow_timeout(
        fake_run,
        "prompt",
        value="ok",
    )

    assert result == "prompt:ok"
    assert seen == [DEFAULTS.agent_workflow_timeout_seconds]


def test_history_processor_keeps_latest_anthropic_compaction() -> None:
    messages = [
        ModelRequest(parts=[UserPromptPart(content="old request")]),
        ModelResponse(parts=[TextPart(content="old response")]),
        ModelResponse(
            parts=[
                CompactionPart(
                    content="summary",
                    provider_name="anthropic",
                )
            ]
        ),
        ModelRequest(parts=[UserPromptPart(content="new request")]),
    ]

    assert keep_last_compaction_history(messages) == messages[2:]


def test_runtime_agent_skill_capabilities_discover_expected_skills() -> None:
    manager = build_manager_skill_capabilities()[0].toolset
    researcher = build_researcher_skill_capabilities()[0].toolset
    scientist = build_scientist_skill_capabilities()[0].toolset
    critic = build_critic_skill_capabilities()[0].toolset

    assert set(manager.skills) == MANAGER_SKILLS
    assert set(researcher.skills) == RESEARCHER_SKILLS
    assert set(scientist.skills) == SCIENTIST_SKILLS
    assert set(critic.skills) == CRITIC_SKILLS
    assert "resources/analysis-output-contract.md" in {
        resource.name for resource in researcher.get_skill("web-research").resources
    }
