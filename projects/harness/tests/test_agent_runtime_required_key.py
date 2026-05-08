from __future__ import annotations

import builtins
import os
from pathlib import Path

import pytest

from situ.harness import agent_runtime
from situ.harness.config import LocalSecretStore
from situ.harness.core.dbos.runtime import reset_dbos_for_tests


@pytest.fixture(autouse=True)
def _reset_dbos() -> None:
    agent_runtime.reset_agent_runtime_cache_for_tests()
    reset_dbos_for_tests()
    yield
    agent_runtime.reset_agent_runtime_cache_for_tests()
    reset_dbos_for_tests()


@pytest.mark.asyncio
async def test_agent_runtime_requires_anthropic_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_configure_observability(*, project_dir: Path) -> None:
        return None

    real_import = builtins.__import__

    def fail_on_logfire_import(
        name: str,
        globals: dict[str, object] | None = None,
        locals: dict[str, object] | None = None,
        fromlist: tuple[str, ...] = (),
        level: int = 0,
    ) -> object:
        if name == "logfire" or name.startswith("logfire."):
            raise AssertionError(
                "AgentRuntime.create must not import logfire before onboarding."
            )
        return real_import(name, globals, locals, fromlist, level)

    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(builtins, "__import__", fail_on_logfire_import)
    monkeypatch.setattr(
        agent_runtime,
        "configure_observability",
        fake_configure_observability,
    )
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda *, project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)

    with pytest.raises(RuntimeError, match="saved local Anthropic key"):
        await agent_runtime.AgentRuntime.create(project_dir=tmp_path)


@pytest.mark.asyncio
async def test_agent_runtime_rejects_situ_anthropic_key_without_local_secret(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_configure_observability(*, project_dir: Path) -> None:
        return None

    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "sk-env-test")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(
        agent_runtime,
        "configure_observability",
        fake_configure_observability,
    )
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda *, project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)

    with pytest.raises(RuntimeError, match="saved local Anthropic key"):
        await agent_runtime.AgentRuntime.create(project_dir=tmp_path)


@pytest.mark.asyncio
async def test_agent_runtime_accepts_saved_local_anthropic_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_configure_observability(*, project_dir: Path) -> None:
        return None

    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(
        agent_runtime,
        "configure_observability",
        fake_configure_observability,
    )
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda *, project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    project_dir.mkdir(parents=True)
    await LocalSecretStore(home=tmp_path / ".situ").set_anthropic_key("sk-saved-test")

    await agent_runtime.AgentRuntime.create(project_dir=project_dir)

    assert "ANTHROPIC_API_KEY" in os.environ
    assert os.environ["ANTHROPIC_API_KEY"] == "sk-saved-test"
