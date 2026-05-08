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


def test_span_passes_filterable_attributes(monkeypatch) -> None:
    calls: list[tuple[str, dict[str, Any]]] = []
    sentinel = object()

    def fake_span(name: str, **kwargs: Any) -> object:
        calls.append((name, kwargs))
        return sentinel

    monkeypatch.setattr(logfire, "span", fake_span)

    result = observability_configure.span(
        "situ.test",
        _level="debug",
        project_id="P1",
        task_id="T1",
        empty=None,
    )

    assert result is sentinel
    assert calls == [
        (
            "situ.test",
            {
                "_level": "debug",
                "project_id": "P1",
                "task_id": "T1",
            },
        )
    ]


def test_set_current_span_attributes_skips_none(monkeypatch) -> None:
    attributes: dict[str, Any] = {}

    class FakeSpan:
        def set_attribute(self, key: str, value: Any) -> None:
            attributes[key] = value

    monkeypatch.setattr(observability_configure.trace, "get_current_span", FakeSpan)

    observability_configure.set_current_span_attributes(
        project_id="P1",
        workflow_id=None,
    )

    assert attributes == {"project_id": "P1"}


def test_set_current_span_level_sets_logfire_level(monkeypatch) -> None:
    attributes: dict[str, Any] = {}

    class FakeSpan:
        def set_attribute(self, key: str, value: Any) -> None:
            attributes[key] = value

    monkeypatch.setattr(observability_configure.trace, "get_current_span", FakeSpan)

    observability_configure.set_current_span_level("debug")

    assert attributes == {"logfire.level_num": 5}


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
