from __future__ import annotations

from pathlib import Path

import pytest

from almanac.harness import agent_runtime


def test_agent_runtime_requires_openai_key(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("ALMANAC_OPENAI_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(agent_runtime, "configure_observability", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "configure_dbos", lambda _project_dir: None)
    monkeypatch.setattr(agent_runtime, "launch_dbos", lambda: None)

    with pytest.raises(RuntimeError, match="ALMANAC_OPENAI_KEY"):
        agent_runtime.AgentRuntime(tmp_path)
