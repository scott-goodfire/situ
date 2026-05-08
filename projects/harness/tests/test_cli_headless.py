from __future__ import annotations

import argparse
import asyncio
import json
import sqlite3
import subprocess
from pathlib import Path
from typing import Any

import pytest

from situ.harness.app import HarnessApp
from situ.harness.cli import commands as cli, headless
from situ.harness.cli import local_session
from situ.harness.cli.local_session import base_env
from situ.harness.core.paths import BundledRuntime
from situ.harness.core.project_context import ProjectContext


async def _noop_notify(_method: str, _params: dict[str, Any]) -> None:
    return None


async def _noop_stop_process(_process: Any) -> None:
    return None


async def _none_async() -> None:
    return None


async def _fake_source_app_runtime(
    name: str, *, source_dir: str | None = None
) -> BundledRuntime:
    assert name == "session-server"
    assert source_dir is None
    app_root = Path(__file__).resolve().parents[3]
    server_root = app_root / "projects" / "session-server"
    return BundledRuntime(kind="source", path=server_root, source_cwd=server_root)


class FakeAgentRuntime:
    def __init__(self, _project_dir: Path) -> None:
        pass

    @classmethod
    async def create(cls, project_dir: Path) -> "FakeAgentRuntime":
        return cls(project_dir)

    async def plan_session(self, **_kwargs: Any):
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
    monkeypatch.setattr("situ.harness.app.AgentRuntime", FakeAgentRuntime)


def test_status_json_reports_no_active_harness(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()

    code = cli.main(["status", str(workspace)])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["active"] is False
    assert payload["message"] == "no active harness found"
    assert payload["session"] is None


def test_local_session_env_strips_eval_and_provider_secrets(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app_root = tmp_path / "app"
    workspace = tmp_path / "workspace"
    harness_stdio = tmp_path / "bin" / "situ-harness-stdio"
    harness_stdio.parent.mkdir()
    harness_stdio.write_text("#!/bin/sh\n")
    workspace.mkdir()
    monkeypatch.setenv("SITU_ANTHROPIC_KEY", "situ-anthropic")
    monkeypatch.setenv("SITU_LOGFIRE_TOKEN", "situ-logfire")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "provider-anthropic")
    monkeypatch.setenv("LOGFIRE_TOKEN", "provider-logfire")
    monkeypatch.setattr(
        local_session,
        "current_harness_stdio_path",
        lambda: harness_stdio,
    )

    env = base_env(app_root, workspace)

    assert env["SITU_APP_ROOT"] == str(app_root)
    assert env["SITU_WORKSPACE"] == str(workspace)
    assert env["SITU_HARNESS_STDIO"] == str(harness_stdio)
    assert "SITU_ANTHROPIC_KEY" not in env
    assert "SITU_LOGFIRE_TOKEN" not in env
    assert "ANTHROPIC_API_KEY" not in env
    assert "LOGFIRE_TOKEN" not in env


def test_live_app_matches_only_same_harness_runtime(tmp_path: Path) -> None:
    expected = str(tmp_path / "expected" / "situ-harness-stdio")
    other = str(tmp_path / "other" / "situ-harness-stdio")

    assert local_session.live_app_matches_env(
        {"situ_harness_stdio": expected},
        {"SITU_HARNESS_STDIO": expected},
    )
    assert not local_session.live_app_matches_env(
        {"situ_harness_stdio": other},
        {"SITU_HARNESS_STDIO": expected},
    )
    assert local_session.live_app_matches_env(
        {"url": "http://127.0.0.1:1"},
        {"SITU_HARNESS_STDIO": expected},
    )


def test_current_harness_stdio_path_uses_unresolved_python_symlink(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    venv_bin = tmp_path / ".venv" / "bin"
    venv_bin.mkdir(parents=True)
    python = venv_bin / "python3"
    harness = venv_bin / "situ-harness-stdio"
    python.write_text("#!/bin/sh\n")
    harness.write_text("#!/bin/sh\n")
    monkeypatch.setattr(local_session.sys, "executable", str(python))

    assert local_session.current_harness_stdio_path() == harness


@pytest.mark.asyncio
async def test_snapshot_json_reads_local_state_without_live_session(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".situ"
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=project_home,
        notify=_noop_notify,
    )
    await app.handle_async("setup.complete", {})

    code = await asyncio.to_thread(cli.main, ["snapshot", str(workspace)])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["source"] == "local"
    assert payload["snapshot"]["workspaces"][0]["repo_path"] == str(workspace)
    assert payload["snapshot"]["projects"] == []
    assert payload["snapshot"]["events"][0]["type"] == "setup.completed"


@pytest.mark.asyncio
async def test_events_json_lines_reads_local_events(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".situ"
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=project_home,
        notify=_noop_notify,
    )
    await app.record_event(event_type="system.ready", message="Harness ready")

    code = await asyncio.to_thread(cli.main, ["events", str(workspace)])

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
                "associated_project_id": None,
                "associated_session_id": None,
                "type": "system.ready",
            },
            "type": "event",
        }
    ]


@pytest.mark.asyncio
async def test_clear_removes_local_state_for_workspace(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".situ"
    app = await HarnessApp.create(
        workspace,
        app_root=Path.cwd(),
        project_home=project_home,
        notify=_noop_notify,
    )
    await app.record_event(event_type="system.ready", message="Harness ready")
    context = ProjectContext(repo_root=workspace, home=project_home)

    code = await asyncio.to_thread(cli.main, ["clear", str(workspace)])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert captured.err == ""
    assert payload["cleared"] is True
    assert payload["project_id"] == context.project_id
    assert not context.project_dir.exists()
    connection = sqlite3.connect(context.database_path)
    try:
        workspace_count = connection.execute("SELECT count(*) FROM workspaces").fetchone()[0]
        event_count = connection.execute("SELECT count(*) FROM events").fetchone()[0]
    finally:
        connection.close()
    assert workspace_count == 0
    assert event_count == 0


def test_clear_refuses_active_harness_without_force(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    project_home = Path.home() / ".situ"
    context = asyncio.run(ProjectContext.create(repo_root=workspace, home=project_home))

    async def fake_read_live_session(_workspace: Path) -> dict[str, Any]:
        return {"pid": 123, "url": "http://127.0.0.1:1"}

    monkeypatch.setattr(
        "situ.harness.cli.headless.clear.command.read_live_session",
        fake_read_live_session,
    )

    code = cli.main(["clear", str(workspace)])

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
    project_home = Path.home() / ".situ"
    context = asyncio.run(ProjectContext.create(repo_root=workspace, home=project_home))
    terminated: list[dict[str, Any]] = []
    session: dict[str, Any] = {"pid": 123, "url": "http://127.0.0.1:1"}

    async def fake_read_live_session(_workspace: Path) -> dict[str, Any]:
        return session

    async def fake_terminate_live_session(*, session: dict[str, Any]) -> None:
        terminated.append(session)

    monkeypatch.setattr(
        "situ.harness.cli.headless.clear.command.read_live_session",
        fake_read_live_session,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.clear.command.terminate_live_session",
        fake_terminate_live_session,
    )

    code = cli.main(["clear", str(workspace), "--force"])

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

    async def fake_start_session_server(
        workspace: Path,
        env: dict[str, str],
        *,
        quiet: bool,
    ) -> tuple[Any, dict[str, str]]:
        assert quiet is True
        assert env["SITU_MAX_EXPERIMENTS"] == "2"
        assert env["SITU_WORKSPACE"] == str(workspace)
        return object(), {"url": "http://127.0.0.1:1"}

    async def fake_stop_process(_process: Any) -> None:
        return None

    def fake_rpc_request(
        _session: dict[str, str],
        method: str,
        params: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> dict[str, Any]:
        calls.append((method, params or {}))
        if method == "session.start":
            return {"session_id": "S1", "status": "active"}
        if method == "session.status":
            return {
                "session": {
                    "id": "S1",
                    "workspace_id": "workspace_test",
                    "project_id": "P1",
                    "status": "closed",
                }
            }
        if method == "collections.bootstrap":
            return {
                "sessions": [
                    {
                        "id": "S1",
                        "workspace_id": "workspace_test",
                        "project_id": "P1",
                        "status": "closed",
                    }
                ],
                "events": [],
            }
        raise AssertionError(f"unexpected RPC method {method}")

    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.start_session_server",
        fake_start_session_server,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.stop_process",
        fake_stop_process,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.rpc_request",
        fake_rpc_request,
    )

    code = cli.main(
        [
            "exec",
            str(workspace),
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
    assert "started S1" in captured.err
    assert payload["status"] == "completed"
    assert payload["session_id"] == "S1"
    assert calls == [
        (
            "session.start",
            {
                "objective": "Improve the score",
                "research_context": (
                    "Run local evals. Use project-native tools, tests, evals, "
                    "benchmarks, logs, and artifacts. Capture plaintext evidence, "
                    "useful interpretations, concerns, and activities."
                ),
                "max_experiments": 2,
            },
        ),
        ("session.status", {"session_id": "S1"}),
        ("collections.bootstrap", {}),
    ]


def test_exec_resumes_latest_session_when_requested_without_id(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    calls: list[tuple[str, dict[str, Any]]] = []

    async def fake_start_session_server(
        _workspace: Path,
        _env: dict[str, str],
        *,
        quiet: bool,
    ) -> tuple[Any, dict[str, str]]:
        assert quiet is True
        return object(), {"url": "http://127.0.0.1:1"}

    def fake_rpc_request(
        _session: dict[str, str],
        method: str,
        params: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> dict[str, Any]:
        calls.append((method, params or {}))
        if method == "collections.bootstrap" and len(calls) == 1:
            return {
                "sessions": [
                    {
                        "id": "S1",
                        "workspace_id": "workspace_test",
                        "project_id": "P1",
                        "status": "closed",
                    }
                ],
                "events": [],
            }
        if method == "session.resume":
            return {"session_id": "S1", "status": "active"}
        if method == "session.status":
            return {
                "session": {
                    "id": "S1",
                    "workspace_id": "workspace_test",
                    "project_id": "P1",
                    "status": "closed",
                }
            }
        if method == "collections.bootstrap":
            return {
                "sessions": [
                    {
                        "id": "S1",
                        "workspace_id": "workspace_test",
                        "project_id": "P1",
                        "status": "closed",
                    }
                ],
                "events": [],
            }
        raise AssertionError(f"unexpected RPC method {method}")

    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.start_session_server",
        fake_start_session_server,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.stop_process",
        _noop_stop_process,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.rpc_request",
        fake_rpc_request,
    )

    code = cli.main(
        [
            "exec",
            str(workspace),
            "--resume",
            "--max-experiments",
            "3",
            "--timeout",
            "1",
        ]
    )

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 0
    assert "resumed S1" in captured.err
    assert payload["status"] == "completed"
    assert payload["session"]["project_id"] == "P1"
    assert calls == [
        ("collections.bootstrap", {}),
        ("session.resume", {"session_id": "S1", "max_experiments": 3}),
        ("session.status", {"session_id": "S1"}),
        ("collections.bootstrap", {}),
    ]


def test_exec_returns_failure_when_closed_session_has_failed_event(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()

    def fake_rpc_request(
        _session: dict[str, str],
        method: str,
        params: dict[str, Any] | None = None,
        **_kwargs: Any,
    ) -> dict[str, Any]:
        if method == "session.start":
            return {"session_id": "S1", "status": "active"}
        if method == "session.status":
            return {
                "session": {
                    "id": "S1",
                    "workspace_id": "workspace_test",
                    "project_id": "P1",
                    "status": "closed",
                }
            }
        if method == "collections.bootstrap":
            return {
                "sessions": [
                    {
                        "id": "S1",
                        "workspace_id": "workspace_test",
                        "project_id": "P1",
                        "status": "closed",
                    }
                ],
                "events": [
                    {
                        "type": "session.failed",
                        "associated_session_id": "S1",
                        "associated_project_id": "P1",
                    }
                ],
            }
        raise AssertionError(f"unexpected RPC method {method}")

    async def fake_start_session_server(*_args: Any, **_kwargs: Any) -> tuple[Any, dict[str, str]]:
        return object(), {"url": "http://127.0.0.1:1"}

    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.start_session_server",
        fake_start_session_server,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.stop_process",
        _noop_stop_process,
    )
    monkeypatch.setattr(
        "situ.harness.cli.headless.exec.command.rpc_request",
        fake_rpc_request,
    )

    code = cli.main(
        [
            "exec",
            str(workspace),
            "--objective",
            "Improve the score",
            "--context",
            "Run local evals.",
            "--timeout",
            "1",
        ]
    )

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert code == 1
    assert payload["status"] == "failed"
    assert payload["session_id"] == "S1"


def test_session_start_params_keeps_context_vague_and_signal_oriented() -> None:
    args = argparse.Namespace(
        objective=None,
        context=(
            "Use the available eval scripts and logs. "
            "Run python eval.py --json and capture its JSON signals. "
            "Expected signals: score, latency_ms."
        ),
    )

    from situ.harness.cli.headless._shared.workspace import session_start_params

    params = session_start_params(
        args=args,
        workspace=Path("/tmp/project"),
    )

    assert params["objective"] == "Explore autoresearch opportunities in /tmp/project"
    assert params["research_context"] == (
        "Use the available eval scripts and logs. "
        "Run python eval.py --json and capture its JSON signals. "
        "Expected signals: score, latency_ms. "
        "Use project-native tools, tests, evals, benchmarks, logs, and artifacts. "
        "Capture plaintext evidence, useful interpretations, concerns, and activities."
    )
    assert params["max_experiments"] == 6


def test_app_launches_project_home_without_workspace(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    launch_directory = tmp_path / "not-an-situ-workspace"
    launch_directory.mkdir()
    calls: list[dict[str, Any]] = []

    async def fake_run(
        command: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str],
    ) -> int:
        calls.append({"command": command, "cwd": cwd, "env": env})
        return 0

    monkeypatch.chdir(launch_directory)
    monkeypatch.delenv("SITU_WORKSPACE", raising=False)
    monkeypatch.setattr(
        "situ.harness.cli.commands.app.command.resolve_bundled_runtime",
        _fake_source_app_runtime,
    )
    monkeypatch.setattr("situ.harness.cli.commands.app.command.read_live_app", _none_async)
    monkeypatch.setattr("situ.harness.cli.commands.app.command.run_process", fake_run)

    code = cli.main(["app", "--rebuild-web"])

    assert code == 0
    assert len(calls) == 2
    assert calls[0]["command"] == ["bun", "run", "build"]
    assert calls[1]["command"] == [
        "bun",
        "run",
        "dev",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        "0",
        "--web-dist",
        str(Path(calls[0]["env"]["SITU_APP_ROOT"]) / "projects" / "web" / "dist"),
    ]
    assert "SITU_APP_ROOT" in calls[0]["env"]
    assert calls[0]["cwd"] == (
        Path(calls[0]["env"]["SITU_APP_ROOT"]) / "projects" / "web"
    )
    assert "SITU_WORKSPACE" not in calls[0]["env"]
    assert "SITU_WORKSPACE" not in calls[1]["env"]


def test_app_skips_build_when_dist_exists(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    launch_directory = tmp_path / "not-an-situ-workspace"
    launch_directory.mkdir()
    calls: list[dict[str, Any]] = []

    async def fake_run(
        command: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str],
    ) -> int:
        calls.append({"command": command, "cwd": cwd, "env": env})
        return 0

    monkeypatch.chdir(launch_directory)

    monkeypatch.setattr(
        "situ.harness.cli.commands.app.command.resolve_bundled_runtime",
        _fake_source_app_runtime,
    )

    async def fake_resolve_web_dist(**_kwargs: Any) -> Path:
        return Path("/tmp/situ-web-dist")

    monkeypatch.setattr("situ.harness.cli.commands.app.command.read_live_app", _none_async)
    monkeypatch.setattr(
        "situ.harness.cli.commands.app.command.resolve_web_dist",
        fake_resolve_web_dist,
    )
    monkeypatch.setattr("situ.harness.cli.commands.app.command.run_process", fake_run)

    code = cli.main(["app"])

    assert code == 0
    assert len(calls) == 1
    assert calls[0]["command"] == [
        "bun",
        "run",
        "dev",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        "0",
        "--web-dist",
        "/tmp/situ-web-dist",
    ]


def test_web_requires_existing_app(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr("situ.harness.cli.commands.web.command.read_live_app", _none_async)

    code = cli.main(["web"])

    captured = capsys.readouterr()
    assert code == 1
    assert captured.out == ""
    assert "no active Situ app found" in captured.err


def test_web_prints_existing_app_url(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    async def fake_read_live_app() -> dict[str, str]:
        return {"url": "http://127.0.0.1:1234"}

    monkeypatch.setattr(
        "situ.harness.cli.commands.web.command.read_live_app",
        fake_read_live_app,
    )

    code = cli.main(["web"])

    captured = capsys.readouterr()
    assert code == 0
    assert captured.out == "http://127.0.0.1:1234\n"
    assert captured.err == ""


def test_web_rejects_server_options(
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = cli.main(["web", "--port", "10003"])

    captured = capsys.readouterr()
    assert code == 1
    assert captured.out == ""
    assert "situ web does not bind a server" in captured.err


def test_web_rejects_rebuild(
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = cli.main(["web", "--rebuild"])

    captured = capsys.readouterr()
    assert code == 1
    assert captured.out == ""
    assert "use `situ app --rebuild-web`" in captured.err


@pytest.mark.asyncio
async def test_app_resolve_web_dist_builds_missing_dist(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from situ.harness.cli.commands.app.command import resolve_web_dist

    calls: list[dict[str, Any]] = []
    app_root = tmp_path / "app"
    web_root = app_root / "projects" / "web"
    web_root.mkdir(parents=True)

    async def fake_run(
        command: list[str],
        *,
        cwd: Path | None = None,
        env: dict[str, str],
    ) -> int:
        calls.append({"command": command, "cwd": cwd, "env": env})
        return 0

    monkeypatch.setattr("situ.harness.cli.commands.app.command.run_process", fake_run)

    dist = await resolve_web_dist(
        runtime=BundledRuntime(kind="source", path=tmp_path, source_cwd=tmp_path),
        app_root=app_root,
        rebuild=False,
        env={},
    )

    assert dist == web_root / "dist"
    assert calls == [{"command": ["bun", "run", "build"], "cwd": web_root, "env": {}}]


def test_tui_uses_existing_app_server(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    calls: list[dict[str, Any]] = []
    monkeypatch.delenv("SITU_PROJECT_ID", raising=False)

    async def fake_run_tui(
        *,
        runtime: Any,
        env: dict[str, str],
    ) -> int:
        calls.append({"runtime": runtime, "env": env})
        return 0

    async def fake_read_live_app() -> dict[str, str]:
        return {"url": "http://127.0.0.1:1"}

    monkeypatch.setattr(
        "situ.harness.cli.commands._shared.tui.read_live_app",
        fake_read_live_app,
    )
    monkeypatch.setattr(
        "situ.harness.cli.commands._shared.tui.run_tui",
        fake_run_tui,
    )

    code = cli.main(["tui", str(workspace)])

    assert code == 0
    assert len(calls) == 1
    assert calls[0]["env"]["SITU_APP_URL"] == "http://127.0.0.1:1"
    assert calls[0]["env"]["SITU_WORKSPACE"] == str(workspace)
    assert "SITU_PROJECT_ID" not in calls[0]["env"]
    assert "SITU_APP_TOKEN" not in calls[0]["env"]


def test_resume_opens_tui_in_resume_mode_without_clean_workspace_gate(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "dirty.txt").write_text("dirty\n")
    calls: list[dict[str, Any]] = []

    async def fake_run_tui(
        *,
        runtime: Any,
        env: dict[str, str],
    ) -> int:
        calls.append({"runtime": runtime, "env": env})
        return 0

    async def fake_read_live_app() -> dict[str, str]:
        return {"url": "http://127.0.0.1:1"}

    monkeypatch.setattr(
        "situ.harness.cli.commands._shared.tui.read_live_app",
        fake_read_live_app,
    )
    monkeypatch.setattr(
        "situ.harness.cli.commands._shared.tui.run_tui",
        fake_run_tui,
    )

    code = cli.main(
        [
            "resume",
            str(workspace),
            "--session-id",
            "S7",
            "--max-experiments",
            "2",
        ],
    )

    assert code == 0
    assert len(calls) == 1
    assert calls[0]["env"]["SITU_SESSION_MODE"] == "resume"
    assert calls[0]["env"]["SITU_RESUME_SESSION_ID"] == "S7"
    assert calls[0]["env"]["SITU_MAX_EXPERIMENTS"] == "2"


def test_attach_command_is_not_registered(
    capsys: pytest.CaptureFixture[str],
) -> None:
    from situ.harness.cli.commands.completions.command import TOP_LEVEL_COMMANDS

    assert "attach" not in TOP_LEVEL_COMMANDS

    with pytest.raises(SystemExit) as raised:
        cli.main(["attach"])

    captured = capsys.readouterr()
    assert raised.value.code == 2
    assert "invalid choice" in captured.err


def test_tui_refuses_dirty_git_workspace_before_launch(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    _git(workspace, "init")
    (workspace / "dirty.txt").write_text("dirty\n")

    async def fake_read_live_app() -> None:
        pytest.fail("app discovery should not run for a dirty workspace")

    monkeypatch.setattr(
        "situ.harness.cli.commands._shared.tui.read_live_app",
        fake_read_live_app,
    )
    monkeypatch.setattr(
        "situ.harness.cli.commands._shared.tui.run_tui",
        lambda **_kwargs: pytest.fail("TUI should not launch"),
    )

    code = cli.main(["tui", str(workspace)])

    captured = capsys.readouterr()
    assert code == 1
    assert captured.out == ""
    assert "workspace must be clean before starting a Situ session" in captured.err
    assert "dirty.txt" in captured.err


def _git(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()
