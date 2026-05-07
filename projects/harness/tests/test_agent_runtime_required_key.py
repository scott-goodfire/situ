from __future__ import annotations

import os
from pathlib import Path

import pytest

from situ.harness import agent_runtime
from situ.harness.config import LocalSecretStore


def test_agent_runtime_requires_openai_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("SITU_OPENAI_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(agent_runtime, "configure_observability", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)

    with pytest.raises(RuntimeError, match="SITU_OPENAI_KEY"):
        agent_runtime.AgentRuntime(tmp_path)


def test_agent_runtime_accepts_saved_local_openai_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("SITU_OPENAI_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(agent_runtime, "configure_observability", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)
    project_dir = tmp_path / ".situ" / "projects" / "workspace"
    project_dir.mkdir(parents=True)
    LocalSecretStore(home=tmp_path / ".situ").set_openai_key("sk-saved-test")

    agent_runtime.AgentRuntime(project_dir)

    assert "OPENAI_API_KEY" in os.environ
    assert os.environ["OPENAI_API_KEY"] == "sk-saved-test"
