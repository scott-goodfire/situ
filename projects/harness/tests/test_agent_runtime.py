from __future__ import annotations

from pathlib import Path
from typing import Any

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
from situ.harness.agent_runtime import (
    MANAGER_AGENT_NAME,
    AgentRuntime,
    get_agent_runtime,
    reset_agent_runtime_cache_for_tests,
)
from situ.harness.agents.common import keep_last_compaction_history
from situ.harness.agent_skills import (
    build_critic_skill_capabilities,
    build_manager_skill_capabilities,
    build_researcher_skill_capabilities,
    build_scientist_skill_capabilities,
)
from situ.harness.agents.research.agent import (
    RESEARCHER_AGENT_NAME,
    SCIENTIST_AGENT_NAME,
)
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
    "task-board-curation",
    "task-decomposition",
    "task-execution",
}
RESEARCHER_SKILLS = {
    "codebase-map",
    "hypothesize-task",
    "hypothesis-handoff",
    "interpret-task",
    "prior-art-synthesis",
    "research-record-curation",
    "research-task",
    "source-grounding",
    "task-execution",
    "web-research",
}
SCIENTIST_SKILLS = {
    "baseline-task",
    "experiment-task",
    "source-grounding",
    "task-execution",
}
CRITIC_SKILLS = {
    "review-analysis",
    "review-baseline",
    "review-evaluation",
    "review-experiment",
    "review-hypothesis",
    "source-grounding",
    "task-execution",
}


@pytest.fixture(autouse=True)
def _reset_dbos() -> None:
    reset_agent_runtime_cache_for_tests()
    reset_dbos_for_tests()
    yield
    reset_agent_runtime_cache_for_tests()
    reset_dbos_for_tests()


@pytest.mark.asyncio
async def test_agent_runtime_wraps_scientist_agent_with_dbos_agent(
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
    assert runtime.scientist_agent.name == SCIENTIST_AGENT_NAME
    assert runtime.scientist_agent.model_settings == {
        "thinking": "low",
        "max_tokens": DEFAULTS.agent_model_max_tokens,
        "timeout": DEFAULTS.agent_model_request_timeout_seconds,
        "anthropic_cache": True,
        "anthropic_cache_instructions": True,
        "anthropic_cache_tool_definitions": True,
    }
    assert "AnthropicCompaction" in _capability_type_names(runtime.scientist_agent)
    assert "ProcessHistory" in _capability_type_names(runtime.scientist_agent)
    assert isinstance(runtime.dbos_scientist_agent, DBOSAgent)
    assert runtime.scientist_agent.toolsets
    assert _agent_has_web_search(runtime.scientist_agent)
    assert _agent_skill_names(runtime.scientist_agent) == SCIENTIST_SKILLS
    assert runtime.manager_agent.name == MANAGER_AGENT_NAME
    assert runtime.manager_agent.model_settings == runtime.scientist_agent.model_settings
    assert isinstance(runtime.dbos_manager_agent, DBOSAgent)
    assert runtime.manager_agent.toolsets
    assert _agent_has_web_search(runtime.manager_agent)
    assert _agent_skill_names(runtime.manager_agent) == MANAGER_SKILLS
    assert runtime.researcher_agent.name == RESEARCHER_AGENT_NAME
    assert runtime.researcher_agent.model_settings == runtime.scientist_agent.model_settings
    assert isinstance(runtime.dbos_researcher_agent, DBOSAgent)
    assert runtime.researcher_agent.toolsets
    assert _agent_has_web_search(runtime.researcher_agent)
    assert _agent_skill_names(runtime.researcher_agent) == RESEARCHER_SKILLS
    assert _agent_has_web_search(runtime.critic_agent)
    assert _agent_skill_names(runtime.critic_agent) == CRITIC_SKILLS


@pytest.mark.asyncio
async def test_agent_runtime_create_fails_when_project_runtime_is_cached(
    tmp_path: Path,
) -> None:
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    project_dir.mkdir(parents=True)
    await LocalSecretStore(home=tmp_path / ".situ").set_anthropic_key(
        "test-anthropic-key"
    )

    runtime = await get_agent_runtime(project_dir)

    with pytest.raises(RuntimeError, match="use get_agent_runtime"):
        await AgentRuntime.create(project_dir)
    assert await get_agent_runtime(project_dir) is runtime


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


@pytest.mark.asyncio
async def test_critic_review_conversation_is_scoped_to_work_item(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    runtime = AgentRuntime(project_dir=tmp_path / "workspace")
    conversations: list[str] = []

    class FakeRunResult:
        output = "ok"

    async def fake_run_with_workflow_timeout(
        _run: Any,
        _prompt: str,
        **kwargs: Any,
    ) -> FakeRunResult:
        conversations.append(kwargs["conversation_id"])
        return FakeRunResult()

    monkeypatch.setattr(
        AgentRuntime,
        "_run_with_workflow_timeout",
        staticmethod(fake_run_with_workflow_timeout),
    )

    for work_item_id in ("WI1", "WI2"):
        await runtime.run_review(
            workspace={"id": "W1", "repo_path": str(tmp_path)},
            setup_objective="Improve the metric.",
            setup_research_context="Use local evidence.",
            session_id="S1",
            assigned_review_target="baseline B1 (in_review)",
            assigned_review_target_kind="baseline",
            assigned_review_target_id="B1",
            assigned_review_work_item_id=work_item_id,
        )

    assert conversations == [
        "situ:S1:agent_S1_critic:review:work-item:WI1",
        "situ:S1:agent_S1_critic:review:work-item:WI2",
    ]


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
