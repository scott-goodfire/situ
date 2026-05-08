from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from types import ModuleType
from typing import Any

import logfire
import pytest

from situ.harness.core import observability
from situ.harness.core.observability import configure as observability_configure


@pytest.mark.asyncio
async def test_harness_logfire_configuration_disables_scrubbing(
    monkeypatch,
    tmp_path: Path,
) -> None:
    configure_calls: list[dict[str, Any]] = []

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "eval-token")
    monkeypatch.setenv("LOGFIRE_TOKEN", "provider-token")
    monkeypatch.setattr(observability_configure, "_CONFIGURED", False)
    monkeypatch.setattr(logfire, "configure", lambda **kwargs: configure_calls.append(kwargs))
    monkeypatch.setattr(logfire, "instrument_pydantic_ai", lambda: None)

    await observability.configure_observability()

    assert configure_calls
    assert configure_calls[0]["scrubbing"] is False
    assert "LOGFIRE_TOKEN" not in os.environ


@pytest.mark.asyncio
async def test_eval_logfire_configuration_disables_scrubbing(monkeypatch) -> None:
    configure_calls: list[dict[str, Any]] = []
    module = _load_eval_observability_module()

    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "test-token")
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "test-anthropic-key")
    monkeypatch.setattr(module, "_CONFIGURED", False)
    monkeypatch.setattr(logfire, "configure", lambda **kwargs: configure_calls.append(kwargs))
    monkeypatch.setattr(logfire, "instrument_pydantic_ai", lambda: None)

    await module.configure_eval_observability()

    assert configure_calls
    assert configure_calls[0]["scrubbing"] is False


def _load_eval_observability_module() -> ModuleType:
    repo_root = Path(__file__).resolve().parents[3]
    module_path = repo_root / "evals/framework/logfire/configure_eval_observability/configure.py"
    spec = importlib.util.spec_from_file_location("situ_eval_logfire_configure", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
