from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

import pytest

from almanac.harness import cli, headless
from almanac.harness.app import HarnessApp
from almanac.harness.project_context import ProjectContext


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


def test_clear_removes_local_state_for_workspace(
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
    context = ProjectContext(repo_root=workspace, home=project_home)

    code = cli.main(["clear", str(workspace), "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["cleared"] is True
    assert payload["project_id"] == context.project_id
    assert not context.project_dir.exists()


def test_clear_refuses_active_harness_without_force(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".almanac"
    context = ProjectContext(repo_root=workspace, home=project_home)

    monkeypatch.setattr(
        headless,
        "read_live_session",
        lambda _workspace: {"pid": 123, "url": "http://127.0.0.1:1", "token": "token"},
    )

    code = cli.main(["clear", str(workspace), "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 1
    assert payload["cleared"] is False
    assert payload["reason"] == "active_harness"
    assert context.project_dir.exists()


def test_clear_force_terminates_active_harness_then_removes_state(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".almanac"
    context = ProjectContext(repo_root=workspace, home=project_home)
    terminated: list[dict[str, Any]] = []
    session: dict[str, Any] = {"pid": 123, "url": "http://127.0.0.1:1", "token": "token"}

    monkeypatch.setattr(headless, "read_live_session", lambda _workspace: session)
    monkeypatch.setattr(
        headless,
        "terminate_live_session",
        lambda *, session: terminated.append(session),
    )

    code = cli.main(["clear", str(workspace), "--json", "--force"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert payload["cleared"] is True
    assert terminated == [session]
    assert not context.project_dir.exists()


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


def test_web_launches_project_home_without_workspace(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    launch_directory = tmp_path / "not-an-almanac-workspace"
    launch_directory.mkdir()
    calls: list[dict[str, Any]] = []

    class Completed:
        returncode = 0

    def fake_run(
        command: list[str],
        *,
        cwd: Path,
        env: dict[str, str],
    ) -> Completed:
        calls.append({"command": command, "cwd": cwd, "env": env})
        return Completed()

    monkeypatch.chdir(launch_directory)
    monkeypatch.delenv("ALMANAC_WORKSPACE", raising=False)
    monkeypatch.setattr(cli.subprocess, "run", fake_run)

    code = cli.main(["web", str(launch_directory / "missing-workspace"), "--rebuild"])

    assert code == 0
    assert len(calls) == 2
    assert calls[0]["command"] == ["bun", "run", "build"]
    assert calls[1]["command"] == [
        "bun",
        "run",
        "serve",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        "0",
    ]
    assert "ALMANAC_APP_ROOT" in calls[0]["env"]
    assert calls[0]["cwd"] == (
        Path(calls[0]["env"]["ALMANAC_APP_ROOT"]) / "projects" / "web"
    )
    assert "ALMANAC_WORKSPACE" not in calls[0]["env"]
    assert "ALMANAC_WORKSPACE" not in calls[1]["env"]


def test_web_skips_build_when_dist_exists(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    launch_directory = tmp_path / "not-an-almanac-workspace"
    launch_directory.mkdir()
    calls: list[dict[str, Any]] = []

    class Completed:
        returncode = 0

    def fake_run(
        command: list[str],
        *,
        cwd: Path,
        env: dict[str, str],
    ) -> Completed:
        calls.append({"command": command, "cwd": cwd, "env": env})
        return Completed()

    monkeypatch.chdir(launch_directory)
    monkeypatch.setattr(cli, "should_build_web", lambda _root, *, rebuild: False)
    monkeypatch.setattr(cli.subprocess, "run", fake_run)

    code = cli.main(["web"])

    assert code == 0
    assert len(calls) == 1
    assert calls[0]["command"] == [
        "bun",
        "run",
        "serve",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        "0",
    ]


def test_should_build_web_detects_missing_build(tmp_path: Path) -> None:
    web_root = tmp_path / "web"
    index = web_root / "dist" / "index.html"

    assert cli.should_build_web(web_root, rebuild=False) is True

    index.parent.mkdir(parents=True)
    index.write_text("<main>Almanac</main>")

    assert cli.should_build_web(web_root, rebuild=False) is False
    assert cli.should_build_web(web_root, rebuild=True) is True


def test_start_upserts_global_project_registry(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    calls: list[dict[str, Any]] = []

    class Completed:
        returncode = 0

    def fake_start_session_server(
        app_root: Path,
        workspace: Path,
        env: dict[str, str],
    ) -> tuple[Any, dict[str, str]]:
        return object(), {"url": "http://127.0.0.1:1", "token": "token"}

    def fake_run(
        command: list[str],
        *,
        cwd: Path,
        env: dict[str, str],
    ) -> Completed:
        calls.append({"command": command, "cwd": cwd, "env": env})
        return Completed()

    monkeypatch.setattr(cli, "start_session_server", fake_start_session_server)
    monkeypatch.setattr(cli, "stop_process", lambda _process: None)
    monkeypatch.setattr(cli.subprocess, "run", fake_run)

    code = cli.main(["start", str(workspace)])

    assert code == 0
    assert len(calls) == 1

    registry_path = Path.home() / ".almanac" / "almanac.sqlite"
    connection = sqlite3.connect(registry_path)
    try:
        row = connection.execute(
            "SELECT repo_path, label, archived_at FROM projects WHERE project_id = ?",
            (ProjectContext(workspace).project_id,),
        ).fetchone()
    finally:
        connection.close()

    assert row == (str(workspace), "workspace", None)
