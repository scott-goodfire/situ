from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pytest

from almanac.harness import cli, headless
from almanac.harness.app import HarnessApp


class FakeAgentRuntime:
    def __init__(self, _project_dir: Path) -> None:
        pass

    def plan_session(self, **_kwargs: Any):
        class Plan:
            summary = "fake plan"

            def model_dump(self) -> dict[str, Any]:
                return {"summary": self.summary}

        return Plan()


@pytest.fixture(autouse=True)
def isolated_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    return home


@pytest.fixture(autouse=True)
def fake_agent_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("almanac.harness.app.AgentRuntime", FakeAgentRuntime)


def test_status_json_reports_no_active_harness(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()

    code = cli.main(["status", str(workspace), "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["active"] is False
    assert payload["message"] == "no active harness found"
    assert payload["session"] is None


def test_snapshot_json_reads_local_state_without_live_session(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".almanac"
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=project_home,
        notify=lambda _method, _params: None,
    )
    app.setup_complete(
        {
            "objective": "Improve the score",
            "research_context": "Run local evals. Expected signals: score.",
        }
    )

    code = cli.main(["snapshot", str(workspace), "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["source"] == "local"
    assert payload["snapshot"]["objectives"][0]["title"] == "Improve the score"
    assert payload["snapshot"]["events"][0]["type"] == "setup.completed"


def test_events_json_lines_reads_local_events(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".almanac"
    app = HarnessApp(
        workspace,
        app_root=Path.cwd(),
        project_home=project_home,
        notify=lambda _method, _params: None,
    )
    app.record_event("system.ready", "Harness ready")

    code = cli.main(["events", str(workspace), "--json"])

    captured = capsys.readouterr()
    lines = [json.loads(line) for line in captured.out.splitlines()]
    assert code == 0
    assert captured.err == ""
    assert lines == [
        {
            "event": {
                "created_at": lines[0]["event"]["created_at"],
                "id": 1,
                "message": "Harness ready",
                "payload": {},
                "session_id": None,
                "type": "system.ready",
            },
            "type": "event",
        }
    ]


def test_exec_uses_shared_rpc_lifecycle_and_prints_final_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    calls: list[tuple[str, dict[str, Any]]] = []

    def fake_start_session_server(
        app_root: Path,
        workspace: Path,
        env: dict[str, str],
        *,
        quiet: bool,
    ) -> tuple[Any, dict[str, str]]:
        assert quiet is True
        assert env["ALMANAC_MAX_EXPERIMENTS"] == "2"
        assert env["ALMANAC_WORKSPACE"] == str(workspace)
        return object(), {"url": "http://127.0.0.1:1", "token": "token"}

    def fake_stop_process(_process: Any) -> None:
        return None

    def fake_rpc_request(
        _session: dict[str, str],
        method: str,
        params: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> dict[str, Any]:
        calls.append((method, params or {}))
        if method == "setup.get":
            return {"configured": False}
        if method == "setup.complete":
            return {"config": {}, "objective": {}}
        if method == "session.start":
            return {"session_id": "session_0001", "status": "active"}
        if method == "session.status":
            return {
                "session": {
                    "id": "session_0001",
                    "objective_id": "objective_0001",
                    "status": "closed",
                }
            }
        if method == "collections.bootstrap":
            return {
                "sessions": [
                    {
                        "id": "session_0001",
                        "objective_id": "objective_0001",
                        "status": "closed",
                    }
                ],
                "events": [],
            }
        raise AssertionError(f"unexpected RPC method {method}")

    monkeypatch.setattr(headless, "start_session_server", fake_start_session_server)
    monkeypatch.setattr(headless, "stop_process", fake_stop_process)
    monkeypatch.setattr(headless, "rpc_request", fake_rpc_request)

    code = cli.main(
        [
            "exec",
            str(workspace),
            "--json",
            "--objective",
            "Improve the score",
            "--context",
            "Run local evals.",
            "--max-experiments",
            "2",
            "--timeout",
            "1",
        ]
    )

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert "started session_0001" in captured.err
    assert payload["status"] == "completed"
    assert payload["session_id"] == "session_0001"
    assert calls == [
        ("setup.get", {}),
        (
            "setup.complete",
            {
                "objective": "Improve the score",
                "research_context": (
                    "Run local evals. Capture results, signals, concerns, "
                    "and activities from local experiments."
                ),
            },
        ),
        ("session.start", {"max_experiments": 2}),
        ("session.status", {"session_id": "session_0001"}),
        ("collections.bootstrap", {}),
    ]


def test_setup_params_keeps_context_vague_and_signal_oriented() -> None:
    args = argparse.Namespace(
        objective=None,
        context=(
            "Use the available eval scripts and logs. "
            "Run python eval.py --json and capture its JSON signals. "
            "Expected signals: score, latency_ms."
        ),
    )

    params = headless.setup_params(
        args,
        Path("/tmp/project"),
        Path("/tmp/app"),
    )

    assert params["objective"] == "Observe autoresearch experiments in /tmp/project"
    assert params["research_context"] == (
        "Use the available eval scripts and logs. "
        "Run python eval.py --json and capture its JSON signals. "
        "Expected signals: score, latency_ms. "
        "Capture results, signals, concerns, and activities from local experiments."
    )
