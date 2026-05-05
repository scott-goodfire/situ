from __future__ import annotations

from pathlib import Path

import pytest

from situ.harness.core.workers import WorkerManager


def test_worker_manager_requires_explicit_worker(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SITU_EVAL_COMMAND", raising=False)

    manager = WorkerManager(tmp_path, app_root=tmp_path)

    with pytest.raises(RuntimeError, match="No worker configured"):
        manager._worker_command()
