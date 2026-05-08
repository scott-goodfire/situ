from __future__ import annotations

import os
from pathlib import Path

import pytest

from situ.harness import agent_runtime
from situ.harness.config import LocalSecretStore
from situ.harness.core.dbos.runtime import reset_dbos_for_tests


@pytest.fixture(autouse=True)
def _reset_dbos() -> None:
    reset_dbos_for_tests()
    yield
    reset_dbos_for_tests()


def test_agent_runtime_requires_anthropic_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(agent_runtime, "configure_observability", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)

    with pytest.raises(RuntimeError, match="saved local Anthropic key"):
        agent_runtime.AgentRuntime(tmp_path)


def test_agent_runtime_rejects_situ_anthropic_key_without_local_secret(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "sk-env-test")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(agent_runtime, "configure_observability", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)

    with pytest.raises(RuntimeError, match="saved local Anthropic key"):
        agent_runtime.AgentRuntime(tmp_path)


def test_agent_runtime_accepts_saved_local_anthropic_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("SITU_ANTHROPIC_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(agent_runtime, "configure_observability", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    project_dir.mkdir(parents=True)
    LocalSecretStore(home=tmp_path / ".situ").set_anthropic_key("sk-saved-test")

    agent_runtime.AgentRuntime(project_dir)

    assert "ANTHROPIC_API_KEY" in os.environ
    assert os.environ["ANTHROPIC_API_KEY"] == "sk-saved-test"
