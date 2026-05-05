from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType
from typing import Any

import logfire

from almanac.harness.core import observability


def test_harness_logfire_configuration_disables_scrubbing(monkeypatch) -> None:
    configure_calls: list[dict[str, Any]] = []

    monkeypatch.setattr(observability, "_CONFIGURED", False)
    monkeypatch.setattr(logfire, "configure", lambda **kwargs: configure_calls.append(kwargs))
    monkeypatch.setattr(logfire, "instrument_pydantic_ai", lambda: None)

    observability.configure_observability()

    assert configure_calls
    assert configure_calls[0]["scrubbing"] is False


def test_eval_logfire_configuration_disables_scrubbing(monkeypatch) -> None:
    configure_calls: list[dict[str, Any]] = []
    module = _load_eval_observability_module()

    monkeypatch.setenv("ALMANAC_LOGFIRE_TOKEN", "test-token")
    monkeypatch.setattr(module, "_CONFIGURED", False)
    monkeypatch.setattr(logfire, "configure", lambda **kwargs: configure_calls.append(kwargs))
    monkeypatch.setattr(logfire, "instrument_pydantic_ai", lambda: None)

    module.configure_eval_observability()

    assert configure_calls
    assert configure_calls[0]["scrubbing"] is False


def _load_eval_observability_module() -> ModuleType:
    repo_root = Path(__file__).resolve().parents[3]
    module_path = repo_root / "evals/harness/logfire/configure_eval_observability/configure.py"
    spec = importlib.util.spec_from_file_location("almanac_eval_logfire_configure", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
